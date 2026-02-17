import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const files = await prisma.file.findMany({
      orderBy: { createdAt: "desc" },
    });
    console.log(`API: Fetching files, found ${files.length}`);
    return NextResponse.json(files);
  } catch (error: unknown) {
    console.error("API Error fetching files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}
