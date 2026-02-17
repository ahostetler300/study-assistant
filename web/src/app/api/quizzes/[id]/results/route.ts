import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { score, completedCount, totalCount, skippedCount, userId } = await req.json();

    if (!userId) {
        return NextResponse.json({ error: "UserId is required" }, { status: 400 });
    }

    const result = await prisma.result.create({
      data: {
        score,
        completedCount,
        totalCount,
        skippedCount,
        quizId: params.id,
        userId: userId,
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Save result error:", error);
    return NextResponse.json({ error: "Failed to save result" }, { status: 500 });
  }
}
