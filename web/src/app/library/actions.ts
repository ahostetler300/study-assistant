"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { uploadToGemini, deleteFromGemini } from "@/lib/gemini";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function uploadFile(formData: FormData) {
  const file = formData.get("file") as File;
  const displayName = formData.get("displayName") as string;
  const categoryId = formData.get("categoryId") as string;
  if (!file) return { error: "No file uploaded" };

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = join(process.cwd(), "..", "data", "uploads");
  const processedDir = join(process.cwd(), "..", "data", "processed_content");
  await mkdir(uploadDir, { recursive: true });
  await mkdir(processedDir, { recursive: true });

  const inputPath = join(uploadDir, file.name);
  await writeFile(inputPath, buffer);

  try {
    const skillScript = join(process.cwd(), "..", "skills", "study-guide-processor", "scripts", "universal_processor.py");
    await execPromise(`ONNXRUNTIME_LOGGER_SEVERITY=3 python3 "${skillScript}" "${inputPath}" "${processedDir}"`);

    const mdFileName = `${file.name.replace(/\.[^/.]+$/, "")}.md`;
    const mdPath = join(processedDir, mdFileName);
    const geminiFile = await uploadToGemini(mdPath, "text/markdown");

    const dbFile = await prisma.file.create({
      data: {
        name: file.name,
        displayName: displayName || file.name.replace(/\.[^/.]+$/, ""),
        geminiFileUri: geminiFile.uri,
        mimeType: file.type,
        size: file.size,
        categoryId: categoryId || null,
      },
    });

    await unlink(inputPath);
    revalidatePath("/library");
    return { success: true, file: dbFile };
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return { error: "Failed to process or upload file" };
  }
}

export async function uploadFromUrl(url: string, displayName?: string, categoryId?: string) {
  if (!url) return { error: "No URL provided" };

  try {
    const processedDir = join(process.cwd(), "..", "data", "processed_content");
    await mkdir(processedDir, { recursive: true });

    const skillScript = join(process.cwd(), "..", "skills", "study-guide-processor", "scripts", "universal_processor.py");
    const { stdout } = await execPromise(`ONNXRUNTIME_LOGGER_SEVERITY=3 python3 "${skillScript}" "${url}" "${processedDir}"`);
    
    const match = stdout.match(/✓ Saved to: (.*\.md)/);
    if (!match) throw new Error("Could not determine processed filename");
    const mdFileName = match[1].trim();
    const mdPath = join(processedDir, mdFileName);

    const geminiFile = await uploadToGemini(mdPath, "text/markdown");
    const fileStats = await readFile(mdPath);
    const dbFile = await prisma.file.create({
      data: {
        name: mdFileName,
        displayName: displayName || mdFileName.replace(".md", ""),
        geminiFileUri: geminiFile.uri,
        mimeType: "text/markdown",
        size: fileStats.length,
        categoryId: categoryId || null,
      },
    });

    revalidatePath("/library");
    return { success: true, file: dbFile };
  } catch (error: unknown) {
    console.error("URL Ingestion error:", error);
    const msg = error instanceof Error ? error.message : "Failed to process URL";
    return { error: msg };
  }
}

export async function deleteFile(id: string) {
  try {
    const file = await prisma.file.findUnique({ where: { id } });
    if (file?.geminiFileUri) {
      const fileName = file.geminiFileUri.split('/').pop();
      if (fileName) await deleteFromGemini(fileName);
    }
    
    // Find associated study sets
    const studySets = await prisma.studySet.findMany({
        where: { files: { some: { id } } }
    });

    // For each study set, delete it (this will trigger our manual cascade to quizzes)
    const { deleteStudySet } = await import("@/app/study-sets/actions");
    for (const set of studySets) {
        await deleteStudySet(set.id);
    }

    await prisma.file.delete({ where: { id } });
    revalidatePath("/library");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete error:", error);
    return { error: "Failed to delete file" };
  }
}

export async function updateFile(id: string, newName: string, categoryId?: string | null) {
    try {
        await prisma.file.update({
            where: { id },
            data: { 
                displayName: newName,
                categoryId: categoryId === "none" ? null : categoryId
            }
        });
        revalidatePath("/library");
        return { success: true };
    } catch (e) {
        console.error("Update file error:", e);
        return { error: "Failed to update file" };
    }
}

export async function renameFile(id: string, newName: string) {
    return updateFile(id, newName);
}
