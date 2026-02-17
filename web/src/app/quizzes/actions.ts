"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

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
