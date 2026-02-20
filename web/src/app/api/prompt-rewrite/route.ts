import { NextResponse } from "next/server";
import { rewritePrompt } from "@/lib/gemini"; // Will create this function

export async function POST(request: Request) {
    try {
        const { userPrompt, fileNames, subject } = await request.json();

        if (!userPrompt || userPrompt.trim().split(/\s+/).length < 4) {
            return NextResponse.json({ error: "User prompt must be at least 4 words." }, { status: 400 });
        }
        if (!fileNames) {
            return NextResponse.json({ error: "Source file names are required." }, { status: 400 });
        }
        if (!subject) {
            return NextResponse.json({ error: "Subject/category is required." }, { status: 400 });
        }

        const promptTemplate = `
You are an expert Prompt Engineer for Educational AI. Your task is to transform a raw user request into a "Power User Prompt" optimized for generating high-quality study questions.

Return ONLY the rewritten prompt. Do NOT include any conversational filler, intro text, outro text, or formatting requirements in your response.  Do NOT Provide instructions for the number of questions to produce . Keep the output concise and directly usable by another LLM.

## Context
- **Subject:** ${subject}
- **Source Material:** ${fileNames}

## Transformation Rules
1. **Clarify Scope:** Map the user's raw intent to specific themes likely found in the subject/file.
2. **Pedagogical Depth:** If the user doesn't specify difficulty, default to a mix of "Conceptual Understanding" and "Critical Application."
3. **Structure & Tone:** Ensure the generated output prompt is formatted as a direct instruction set for another LLM.
4. **Negative Constraints:** Include "Anti-Patterns" to avoid (e.g., no "all of the above" answers).

## User Input to Rewrite:
> "${userPrompt}"
        `;

        const rewrittenPrompt = await rewritePrompt(promptTemplate);

        if (!rewrittenPrompt) {
            return NextResponse.json({ error: "Gemini failed to rewrite the prompt." }, { status: 500 });
        }

        return NextResponse.json({ rewrittenPrompt });

    } catch (error: any) {
        console.error("API Error during prompt rewrite:", error);
        return NextResponse.json({ error: error.message || "Failed to rewrite prompt" }, { status: 500 });
    }
}
