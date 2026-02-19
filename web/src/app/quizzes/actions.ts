"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getApiKey } from "@/lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function createQuizAction({ userId, title, setIds, limit }: { userId: string, title: string, setIds: string[], limit?: number }) {
  try {
    // 1. Get all questions from the selected study sets
    const studySets = await prisma.studySet.findMany({
        where: { id: { in: setIds } },
        include: { questions: true }
    });

    let allQuestions = studySets.flatMap(s => s.questions);

    // 2. Handle limiting (Randomization is now handled at runtime)
    if (limit && limit < allQuestions.length) {
        allQuestions = allQuestions
            .sort(() => 0.5 - Math.random())
            .slice(0, limit);
    }

    // 3. Create the user-specific quiz
    const quiz = await prisma.quiz.create({
        data: {
            title,
            userId,
            studySets: { connect: setIds.map(id => ({ id })) },
            questions: { connect: allQuestions.map(q => ({ id: q.id })) }
        }
    });

    revalidatePath("/quizzes");
    return { success: true, quizId: quiz.id };
  } catch (error) {
    console.error("Quiz creation error:", error);
    return { error: "Failed to assemble quiz" };
  }
}

export async function saveResultAction(data: { userId: string, quizId: string, score: number, attempted: number, total: number }) {
    try {
        await prisma.result.create({
            data: {
                userId: data.userId,
                quizId: data.quizId,
                score: data.score,
                completedCount: data.attempted,
                totalCount: data.total,
                skippedCount: data.total - data.attempted
            }
        });
        revalidatePath("/dashboard");
        revalidatePath("/quizzes");
        return { success: true };
    } catch (e) {
        return { error: "Failed to save result" };
    }
}

export async function deleteQuiz(id: string) {
    try {
        await prisma.quiz.delete({ where: { id } });
        revalidatePath("/quizzes");
        revalidatePath("/dashboard");
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete" };
    }
}

export async function renameQuiz(id: string, newTitle: string) {
    try {
        await prisma.quiz.update({
            where: { id },
            data: { title: newTitle }
        });
        revalidatePath("/quizzes");
        return { success: true };
    } catch (e) {
        return { error: "Failed to rename" };
    }
}

export async function getAIExplanationAction(data: { 
    questionText: string, 
    options: string[], 
    correctAnswer: number,
    userExplanation?: string | null
}) {
    try {
        const apiKey = await getApiKey();
        const genAI = new GoogleGenerativeAI(apiKey);
        
        const modelSetting = await prisma.systemSetting.findUnique({ where: { key: "gemini_model" } });
        const modelName = modelSetting?.value || "gemini-2.5-flash";
        
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
                temperature: 0.4,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2000,
            }
        });

        const prompt = `
Role: Expert Academic Tutor
Task: Provide a detailed, pedagogical explanation for a specific quiz question.

---
QUESTION: 
${data.questionText}

OPTIONS:
${data.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n")}

CORRECT ANSWER:
${data.options[data.correctAnswer]}

EXISTING CONTEXT:
${data.userExplanation || "No additional explanation provided."}
---

INSTRUCTIONS:
1. **Core Concept**: Use "### Core Concept" as a header. Provide a 1-sentence summary of the principle being tested.
2. **Detailed Rationale**: Use "### Detailed Rationale" as a header. Explain step-by-step why the correct answer is the most accurate.
3. **Distractor Analysis**: Use "### Distractor Analysis" as a header. Briefly explain why the other options are incorrect.
4. **Deep Dive**: Use "### Deep Dive" as a header. Provide one additional interesting fact or context-building detail.
5. **Formatting**: Use Markdown headers (###) for each section.
6. **NO FLUFF**: Do NOT include any introductory greetings (e.g., "Hello!", "As your tutor..."), self-introductions, or concluding encouraging remarks (e.g., "Keep up the work!"). Start immediately with the Core Concept and end immediately after the Deep Dive.
`;

        const result = await model.generateContent(prompt);
        return { text: result.response.text() };
    } catch (error: any) {
        console.error("AI Explanation Error:", error);
        return { error: error.message || "Failed to generate AI tutor response" };
    }
}
