"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { readFile } from "fs/promises";
import { generateQuestions } from "@/lib/gemini";
import type { Part } from "@google/generative-ai";
import { getSystemPrompt, getHardcodedSchema } from "@/lib/prompts";

interface GeminiQuestion {
    q: string;
    o: string[];
    a: number;
    e: string;
}

// Rebuild trigger for cache schema sync
export async function createStudySet(formData: FormData) {
  const title = formData.get("title") as string;
  const instructions = formData.get("instructions") as string;
  const categoryId = formData.get("categoryId") as string;
  const difficultyLevel = formData.get("difficultyLevel") as string;
  const specificChaptersSections = formData.get("specificChaptersSections") as string;
  const count = formData.get("count") as string;
  const fileIds = formData.getAll("fileIds") as string[];
  const useCache = formData.get("useCache") === "true";

  if (!title) return { error: "Title is required" };
  if (fileIds.length === 0) return { error: "Please select sources" };
  if (!categoryId || categoryId === "all") { 
    return { error: "Please select a target category for this Study Set" }; 
  }

  const files = await prisma.file.findMany({
    where: { id: { in: fileIds } }
  });

  if (files.length === 0) return { error: "Sources not found" };

  const persona = await getSystemPrompt();
  const requestedCount = parseInt(count);
  const isHighVolume = requestedCount > 20;
  const schema = await getHardcodedSchema(isHighVolume);
  
  const fullPrompt = `
    ${persona}

    TASK: Generate exactly ${requestedCount} unique multiple-choice questions based on the provided SOURCE documents.
    - DIFFICULTY LEVEL: ${getDifficultyDescription(difficultyLevel)}
    - FOCUS INSTRUCTIONS: ${instructions || "General summary of important concepts."}
    - SOURCE CHAPTERS/SECTIONS: ${specificChaptersSections || "All source material"}
    
    ${schema}
  `;

  try {
    const contentParts: Part[] = [];
    for (const file of files) {
      if (!file.localPath) {
        throw new Error(`File ${file.displayName || file.name} has no local path.`);
      }
      try {
        const content = await readFile(file.localPath, 'utf-8');
        contentParts.push({ text: content });
      } catch (readError: any) {
        if (readError.code === 'ENOENT') {
          throw new Error(`Local file not found for ${file.displayName || file.name} at ${file.localPath}`);
        }
        throw readError;
      }
    }

    const { text: responseText, usage } = await generateQuestions({
        contents: contentParts,
        prompt: fullPrompt,
        useCache,
        fileIds
    });
    
    // In JSON mode, the model might return a JSON array directly or wrapped in an object
    let questionsData: GeminiQuestion[] = [];
    try {
        const parsed = JSON.parse(responseText.trim());
        if (Array.isArray(parsed)) {
            questionsData = parsed;
        } else if (parsed.questions && Array.isArray(parsed.questions)) {
            questionsData = parsed.questions;
        } else {
            // If it's a single object, wrap it
            questionsData = [parsed];
        }
    } catch (parseError) {
        console.error("JSON parse failed in structured mode:", parseError);
        // Fallback to extraction logic if structured mode failed (unlikely)
        let cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const startIdx = cleanJson.indexOf('[');
        const lastIdx = cleanJson.lastIndexOf(']');
        if (startIdx !== -1 && lastIdx !== -1) {
            cleanJson = cleanJson.substring(startIdx, lastIdx + 1);
        }
        
        try {
            questionsData = JSON.parse(cleanJson);
        } catch (salvageError) {
            console.error("Salvage failed. Content snippet:", cleanJson.substring(0, 500));
            const salvaged = salvageJson(cleanJson);
            if (salvaged) {
                questionsData = JSON.parse(salvaged);
            } else {
                throw new Error("AI output was unparseable. The source content may be too complex or the model is behaving unexpectedly.");
            }
        }
    }

    if (!questionsData || questionsData.length === 0) {
        return { error: "AI failed to generate any valid questions. Try reducing the count or being more specific in your instructions." };
    }

    const studySet = await prisma.studySet.create({
      data: {
        title,
        instructions,
        difficultyLevel,
        specificChaptersSections,
        category: { connect: { id: categoryId } },
        geminiInputTokens: usage.input,
        geminiOutputTokens: usage.output,
        geminiCached: usage.cached,
        geminiCacheHit: usage.isHit,
        geminiCachedTokens: usage.cachedTokens,
        files: { connect: files.map(f => ({ id: f.id })) },
        questions: {
          create: questionsData.map((q) => ({
            text: q.q,
            options: JSON.stringify(q.o),
            correctAnswer: q.a,
            explanation: q.e,
          })),
        },
      },
    });

    revalidatePath("/study-sets");
    return { 
        success: true, 
        studySetId: studySet.id,
        stats: usage
    };
  } catch (error: any) {
    console.error("AI Synthesis Critical Error:", error);
    
    let userMessage = "AI Synthesis failed. ";
    const msg = error.message || "";
    
    if (msg.includes("401") || msg.includes("403")) {
        userMessage += "The API Key is invalid or unauthorized. Please check your settings.";
    } else if (msg.includes("429")) {
        userMessage += "Rate limit exceeded. Please wait a moment before trying again.";
    } else if (msg.includes("SAFETY")) {
        userMessage += "The content was blocked by AI safety filters.";
    } else if (msg.includes("not found") || msg.includes("expired")) {
        userMessage += "Source files not found on Gemini. Please re-upload the source in your library.";
    } else {
        userMessage += msg || "Check your API key and source content.";
    }

    return { error: userMessage };
  }
}

export async function deleteStudySet(id: string) {
    try {
        // Cascade manually to remove associated quizzes as requested
        await prisma.quiz.deleteMany({
            where: { studySets: { some: { id } } }
        });

        await prisma.studySet.delete({ where: { id } });
        revalidatePath("/study-sets");
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete" };
    }
}

export async function renameStudySet(id: string, newTitle: string) {
    try {
        await prisma.studySet.update({
            where: { id },
            data: { title: newTitle }
        });
        revalidatePath("/study-sets");
        return { success: true };
    } catch (e) {
        return { error: "Failed to rename" };
    }
}

export async function updateQuestionAction(id: string, data: { text: string; options: string; correctAnswer: number; explanation: string | null }) {
    try {
        await prisma.question.update({
            where: { id },
            data: {
                text: data.text,
                options: data.options,
                correctAnswer: data.correctAnswer,
                explanation: data.explanation
            }
        });
        return { success: true };
    } catch (e) {
        console.error("Update question error:", e);
        return { error: "Failed to update question" };
    }
}

export async function deleteQuestionAction(id: string, studySetId: string) {
    try {
        await prisma.question.delete({
            where: { id }
        });
        revalidatePath(`/study-sets/${studySetId}/edit`);
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete question" };
    }
}

export async function updateSetMetadata(id: string, data: { title: string; categoryId: string | null; instructions: string; difficultyLevel: string; specificChaptersSections: string }) {
    try {
        await prisma.studySet.update({
            where: { id },
            data: {
                title: data.title,
                categoryId: data.categoryId,
                instructions: data.instructions,
                difficultyLevel: data.difficultyLevel,
                specificChaptersSections: data.specificChaptersSections
            }
        });
        revalidatePath("/study-sets");
        revalidatePath(`/study-sets/${id}/edit`);
        return { success: true };
    } catch (e) {
        return { error: "Failed to update study set details" };
    }
}

/**
 * Attempts to repair truncated JSON by finding the last complete object in an array.
 */
function salvageJson(jsonStr: string): string | null {
    // If it doesn't even start like an array, we can't salvage it easily
    if (!jsonStr.trim().startsWith('[')) return null;

    // Remove anything after the last potential object closure
    const lastBrace = jsonStr.lastIndexOf('}');
    if (lastBrace === -1) return null;

    let partial = jsonStr.substring(0, lastBrace + 1).trim();
    
    // Ensure it ends with a closing array bracket
    if (!partial.endsWith(']')) {
        partial += ']';
    }

    // Double check if we can parse it now
    try {
        JSON.parse(partial);
        return partial;
    } catch (e) {
        // If still failing, it might be a comma issue or deep nesting
        // Try removing a trailing comma if it exists before the bracket we added
        const cleaned = partial.replace(/,\s*\]$/, ']');
        try {
            JSON.parse(cleaned);
            return cleaned;
        } catch (e2) {
            return null;
        }
    }
}

function getDifficultyDescription(level: string): string {
  switch (level) {
    case "Easy":
      return "Focus on direct recall of facts, definitions, or basic comprehension.";
    case "Medium":
      return "Require application of concepts, analysis of examples, or understanding of relationships.";
    case "Hard":
      return "Demand synthesis of information, evaluation of scenarios, or critical thinking.";
    default:
      return "General summary of important concepts.";
  }
}

