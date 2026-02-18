import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const studySets = await prisma.studySet.findMany({
      include: {
        _count: { select: { questions: true } },
        category: true,
        files: true
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(studySets);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch study sets" }, { status: 500 });
  }
}
