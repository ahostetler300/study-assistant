"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { writeFile, mkdir, unlink, readFile, access } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { createId } from "@paralleldrive/cuid2";
import { constants as fsConstants } from 'fs';
import { resolveLocalPath } from "@/lib/pathUtils";

const execPromise = promisify(exec);

export async function uploadFile(formData: FormData) {
  const file = formData.get("file") as File;
  const displayName = formData.get("displayName") as string;
  const categoryId = formData.get("categoryId") as string;
  if (!file) return { error: "No file uploaded" };

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = join(process.cwd(), "..", "data", "uploads");
  const processedContentDir = join(process.cwd(), "..", "data", "processed_content");
  await mkdir(uploadDir, { recursive: true });
  await mkdir(processedContentDir, { recursive: true });

  const inputPath = join(uploadDir, file.name);
  await writeFile(inputPath, buffer);

  const newFileId = createId(); 
  const outputFilename = `${newFileId}.md`;

  try {
    const skillScript = join(process.cwd(), "..", "skills", "study-guide-processor", "scripts", "universal_processor.py");
    const { stdout, stderr } = await execPromise(`python3 "${skillScript}" "${inputPath}" "${outputFilename}" --output_dir "${processedContentDir}"`);

    if (stderr) console.error("Python script STDERR:", stderr);

    const match = stdout.match(/SUCCESS: (.*)/);
    if (!match) {
        throw new Error(`Python script did not return success path. STDOUT: ${stdout}`);
    }
    const localPath = match[1].trim();

    const dbFile = await prisma.file.create({
      data: {
        id: newFileId,
        name: file.name,
        displayName: displayName || file.name.replace(/\.[^/.]+$/, ""),
        localPath: localPath,
        mimeType: file.type,
        size: file.size,
        categoryId: categoryId || null,
        lastVerifiedAt: new Date(),
      },
    });

    await unlink(inputPath); 
    
    revalidatePath("/library");
    return { success: true, file: dbFile };
  } catch (error: unknown) {
    console.error("Upload error:", error);
    await unlink(inputPath).catch(e => console.error("Failed to delete input file on error:", e)); 
    const msg = error instanceof Error ? error.message : "Failed to process or upload file";
    return { error: msg };
  }
}

export async function uploadFromUrl(url: string, displayName?: string, categoryId?: string) {
  if (!url) return { error: "No URL provided" };

  const processedContentDir = join(process.cwd(), "..", "data", "processed_content");
  await mkdir(processedContentDir, { recursive: true });

  const newFileId = createId();
  const outputFilename = `${newFileId}.md`;

  try {
    const skillScript = join(process.cwd(), "..", "skills", "study-guide-processor", "scripts", "universal_processor.py");
    const { stdout, stderr } = await execPromise(`python3 "${skillScript}" "${url}" "${outputFilename}" --output_dir "${processedContentDir}"`);
    
    if (stderr) console.error("Python script STDERR:", stderr);

    const match = stdout.match(/SUCCESS: (.*)/);
    if (!match) {
        throw new Error(`Python script did not return success path. STDOUT: ${stdout}`);
    }
    const localPath = match[1].trim();
    const fileStats = await readFile(localPath); // Read the newly created file to get its size

    const dbFile = await prisma.file.create({
      data: {
        id: newFileId,
        name: new URL(url).hostname, // Use hostname as default name
        displayName: displayName || new URL(url).hostname,
        localPath: localPath,
        mimeType: "text/markdown", // Assuming URL always processes to markdown
        size: fileStats.length,
        categoryId: categoryId || null,
        lastVerifiedAt: new Date(),
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
    
    if (file?.localPath) {
      await unlink(resolveLocalPath(file.localPath)).catch(e => console.error(`Failed to delete local file ${file.localPath}:`, e));
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

export async function checkFileExistenceAction(fileId: string): Promise<{ status: 'verified' | 'missing' | 'unreadable' }> {
  try {
    const fileRecord = await prisma.file.findUnique({ where: { id: fileId } });
    if (!fileRecord || !fileRecord.localPath) {
      return { status: 'missing' };
    }

    try {
      await access(resolveLocalPath(fileRecord.localPath), fsConstants.F_OK | fsConstants.R_OK);
      // If access is successful, update lastVerifiedAt
      await prisma.file.update({
        where: { id: fileId },
        data: { lastVerifiedAt: new Date() }
      });
      return { status: 'verified' };
    } catch (fsError: any) {
      if (fsError.code === 'ENOENT') {
        return { status: 'missing' };
      }
      return { status: 'unreadable' };
    }
  } catch (error) {
    console.error(`Error checking file existence for ${fileId}:`, error);
    return { status: 'unreadable' };
  }
}
