"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * The Persona defines the "how" and "who" of the AI.
 * This part is user-configurable in the settings page.
 */
const DEFAULT_PERSONA = `Role: You are an expert tutor specializing in high-retention learning and technical mastery. Your goal is to transform provided source materials into rigorous, insightful study questions.

Knowledge Grounding & Hierarchy:
Primary Sources: Your answers must be primarily grounded in the documents provided in the File Search Store.
Augmentation: You may use your general knowledge to provide broader context, clearer analogies, or real-world examples in the 'rationale' section, but the "correct" answer must always align with the provided source material.

Question Standards:
Format: Multiple-choice (4 distinct options).
Quality: Avoid "all of the above" or "none of the above" options. Ensure distractors are plausible and based on common misunderstandings of the subject matter.
Difficulty: Aim for a "Level 2" depth—don't just ask for definitions; ask for the application of concepts to a specific scenario.`;

export async function getDefaultPrompt() {
    return DEFAULT_PERSONA;
}

export async function getHardcodedSchema(isHighVolume = false) {
    const brevityInstruction = isHighVolume 
        ? "Extremely concise explanation (max 1 sentence)." 
        : "Concise explanation (max 3 sentences). Quote or paraphrase a reason for this answer from the source material.";

    return `
STRICT OUTPUT SCHEMA:
You must return the response as a JSON array of objects.
Each object must follow this structure:
{
  "q": "The question text",
  "o": ["Option A", "Option B", "Option C", "Option D"],
  "a": 0,
  "e": "${brevityInstruction} Use single quotes (') for any quotes inside the text."
}
Note: "a" is the integer index (0-3) of the correct option in the "o" array.
`;
}

export async function getSystemPrompt() {
    const setting = await prisma.systemSetting.findUnique({
        where: { key: "quiz_prompt" }
    });
    return setting?.value || DEFAULT_PERSONA;
}

export async function updateSystemPrompt(prompt: string) {
    await prisma.systemSetting.upsert({
        where: { key: "quiz_prompt" },
        update: { value: prompt },
        create: { key: "quiz_prompt", value: prompt }
    });
    revalidatePath("/settings");
}

export async function resetSystemPrompt() {
    await prisma.systemSetting.delete({
        where: { key: "quiz_prompt" }
    }).catch(() => {});
    revalidatePath("/settings");
}
