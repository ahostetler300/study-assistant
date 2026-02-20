"use server";

import { encrypt, isSecretConfigured } from "@/lib/encryption";
import { saveSecret, getSecretLive } from "@/lib/secrets";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function saveGeminiKey(formData: FormData) {
  const apiKey = formData.get("apiKey") as string;

  if (!apiKey) return { error: "API Key is required" };
  if (!isSecretConfigured()) return { error: "SETTINGS_SECRET missing in .env.local" };

  try {
    const encryptedKey = encrypt(apiKey);
    await saveSecret("GEMINI_API_KEY_ENCRYPTED", encryptedKey);
    revalidatePath("/settings");
    return { success: true };
  } catch (error: unknown) {
    console.error("Save error:", error);
    return { error: "Failed to encrypt key" };
  }
}

export async function checkSettingsStatus() {
  const hasEncryptedKey = !!(await getSecretLive("GEMINI_API_KEY_ENCRYPTED"));
  const modelSetting = await prisma.systemSetting.findUnique({ where: { key: "gemini_model" } });
  const ttlSetting = await prisma.systemSetting.findUnique({ where: { key: "cache_ttl_minutes" } });
  return {
    hasSecret: isSecretConfigured(),
    hasEncryptedKey,
    selectedModel: modelSetting?.value || "gemini-2.5-flash",
    cacheTtl: parseInt(ttlSetting?.value || "3")
  };
}

export async function saveCacheTtl(minutes: number) {
    try {
        await prisma.systemSetting.upsert({
            where: { key: "cache_ttl_minutes" },
            update: { value: minutes.toString() },
            create: { key: "cache_ttl_minutes", value: minutes.toString() }
        });
        revalidatePath("/settings");
        return { success: true };
    } catch (e) {
        return { error: "Failed to save TTL" };
    }
}

export async function purgeAllCaches() {
    try {
        await prisma.file.updateMany({
            data: {
                geminiCacheId: null,
                geminiCacheExpiresAt: null
            }
        });
        revalidatePath("/settings");
        return { success: true };
    } catch (e) {
        return { error: "Failed to purge caches" };
    }
}

export async function getActiveCaches() {
    try {
        const modelSetting = await prisma.systemSetting.findUnique({ where: { key: "gemini_model" } });
        const selectedModel = modelSetting?.value || "gemini-2.5-flash";

        const filesWithActiveCache = await prisma.file.findMany({
            where: {
                geminiCacheId: { not: null },
                geminiCacheExpiresAt: { gt: new Date() }
            },
            select: {
                id: true,
                displayName: true,
                name: true,
                geminiCacheId: true,
                geminiCacheExpiresAt: true,
            }
        });

        // Map to a user-friendly format (similar to what was returned before)
        const enriched = filesWithActiveCache.map(file => ({
            name: file.geminiCacheId!,
            displayName: file.displayName || file.name || `Cache for File ${file.id}`,
            expireTime: file.geminiCacheExpiresAt,
            model: selectedModel, // Add the selected model here
        }));

        return enriched;
    } catch (e: any) {
        console.error("Failed to fetch active caches:", e);
        return { error: e.message || "Failed to fetch caches" };
    }
}

export async function saveGeminiModel(model: string) {
    try {
        await prisma.systemSetting.upsert({
            where: { key: "gemini_model" },
            update: { value: model },
            create: { key: "gemini_model", value: model }
        });
        revalidatePath("/settings");
        return { success: true };
    } catch (e) {
        return { error: "Failed to save model selection" };
    }
}

export async function getCategories() {
    return await prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(name: string) {
    try {
        await prisma.category.create({ data: { name } });
        revalidatePath("/settings");
        revalidatePath("/library");
        revalidatePath("/study-sets");
        return { success: true };
    } catch (e) {
        return { error: "Failed to create category" };
    }
}

export async function updateCategory(id: string, name: string) {
    try {
        await prisma.category.update({ where: { id }, data: { name } });
        revalidatePath("/settings");
        revalidatePath("/library");
        revalidatePath("/study-sets");
        return { success: true };
    } catch (e) {
        return { error: "Failed to update category" };
    }
}

export async function deleteCategory(id: string) {
    try {
        await prisma.category.delete({ where: { id } });
        revalidatePath("/settings");
        revalidatePath("/library");
        revalidatePath("/study-sets");
        return { success: true };
    } catch (e) {
        return { error: "Failed to delete category. Make sure it has no associated items." };
    }
}
