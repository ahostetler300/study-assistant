import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, GoogleAICacheManager } from "@google/generative-ai/server";
import { decrypt, isSecretConfigured } from "./encryption";
import { getSecretLive } from "./secrets";
import prisma from "./prisma";

export async function getApiKey(): Promise<string> {
  const encryptedKey = await getSecretLive("GEMINI_API_KEY_ENCRYPTED");
  const rawKey = process.env.GEMINI_API_KEY;

  if (encryptedKey && isSecretConfigured()) {
    try {
      return decrypt(encryptedKey);
    } catch (e) {
      console.error("Vault decryption failed:", e);
      throw new Error("Failed to decrypt secure API key. Your master secret in .env.local might have changed or be missing.");
    }
  }

  if (rawKey) return rawKey;
  
  throw new Error("Gemini API Key not configured. Please visit the Admin Settings page to secure your key.");
}

export const uploadToGemini = async (path: string, mimeType: string) => {
  const apiKey = await getApiKey();
  const fileManager = new GoogleAIFileManager(apiKey);
  const uploadResult = await fileManager.uploadFile(path, {
    mimeType,
    displayName: path.split("/").pop(),
  });
  return uploadResult.file;
};

export const deleteFromGemini = async (fileId: string) => {
  const apiKey = await getApiKey();
  const fileManager = new GoogleAIFileManager(apiKey);
  await fileManager.deleteFile(fileId);
};

interface GenerateOptions {
    fileUris: string[];
    prompt: string;
    useCache?: boolean;
    fileIds: string[]; // To track in DB
}

interface AIResult {
    text: string;
    usage: {
        input: number;
        output: number;
        cached: boolean;
        cachedTokens: number;
        isHit: boolean;
        baseline: number;
        skippedSize: boolean;
    };
}

export const generateQuestions = async (options: GenerateOptions): Promise<AIResult> => {
  const { fileUris, prompt, useCache, fileIds } = options;
  const apiKey = await getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const cacheManager = new GoogleAICacheManager(apiKey, { apiVersion: 'v1beta' });
  
  const modelSetting = await prisma.systemSetting.findUnique({ where: { key: "gemini_model" } });
  const modelName = modelSetting?.value || "gemini-2.5-flash";
  const fullModelName = modelName.startsWith("models/") ? modelName : `models/${modelName}`;

  const ttlSetting = await prisma.systemSetting.findUnique({ where: { key: "cache_ttl_minutes" } });
  const ttlMinutes = parseInt(ttlSetting?.value || "3");

  let cacheName: string | undefined;
  let isCacheHit = false;
  let baselineTokens = 0;

  // 1. Caching Logic
  if (fileIds.length > 0) {
    const primaryFile = await prisma.file.findUnique({ where: { id: fileIds[0] } });
    
    // ALWAYS Check if we have a valid cache in DB
    if (primaryFile?.cacheName && primaryFile.cacheExpiresAt && primaryFile.cacheExpiresAt > new Date()) {
        cacheName = primaryFile.cacheName;
        baselineTokens = primaryFile.contextTokenCount || 0;
        isCacheHit = true;
        console.log(`Using existing cache ${cacheName} for ${primaryFile.displayName} (Auto-Optimization)`);
    }

    // If no cache exists, only create a new one if user explicitly enabled it
    if (!cacheName && useCache) {
        // Count tokens to see if it meets the 32k threshold
        const modelForCounting = genAI.getGenerativeModel({ model: modelName });
        const { totalTokens } = await modelForCounting.countTokens({
            contents: [{
                role: 'user',
                parts: [
                    ...fileUris.map(uri => ({ fileData: { mimeType: "text/markdown", fileUri: uri } })),
                    { text: prompt }
                ]
            }]
        });
        
        baselineTokens = totalTokens;

        if (totalTokens >= 32768) {
            console.log(`Context size ${totalTokens} meets threshold. Creating new cache...`);
            try {
                const cache = await cacheManager.create({
                    model: fullModelName,
                    displayName: `Cache for ${primaryFile?.displayName || 'Study Set'}`,
                    contents: [{
                        role: 'user',
                        parts: fileUris.map(uri => ({
                            fileData: { mimeType: "text/markdown", fileUri: uri }
                        }))
                    }],
                    ttlSeconds: ttlMinutes * 60,
                });
                cacheName = cache.name;

                // Save to DB
                await prisma.file.update({
                    where: { id: fileIds[0] },
                    data: {
                        cacheName: cache.name,
                        cacheExpiresAt: new Date(Date.now() + ttlMinutes * 60000),
                        contextTokenCount: totalTokens
                    }
                });
            } catch (err: any) {
                console.error("Cache creation failed:", err.message || err);
                // Fallback to non-cached request below
            }
        }
    }
  }

  // 2. Generate Content (v1beta for caching)
  const finalModel = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
    }
  }, { apiVersion: 'v1beta' });

  try {
    const result = cacheName
        ? await finalModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            cachedContent: cacheName
          })
        : await finalModel.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    ...fileUris.map(uri => ({ fileData: { mimeType: "text/markdown", fileUri: uri } })),
                    { text: prompt }
                ]
            }]
          });

    // If successful and we used a cache, attempt a background TTL refresh
    if (cacheName && isCacheHit) {
        // Silent update - don't wait for it
        cacheManager.update(cacheName, { ttlSeconds: ttlMinutes * 60 } as any).catch(() => {});
        prisma.file.update({
            where: { id: fileIds[0] },
            data: { cacheExpiresAt: new Date(Date.now() + ttlMinutes * 60000) }
        }).catch(() => {});
    }
    
    const response = result.response;
    const isHit = response.usageMetadata?.cachedContentTokenCount ? response.usageMetadata.cachedContentTokenCount > 0 : false;
    console.log("AI Generation Usage Metadata:", JSON.stringify(response.usageMetadata, null, 2));

    return {
        text: response.text(),
        usage: {
            input: response.usageMetadata?.promptTokenCount || 0,
            output: response.usageMetadata?.candidatesTokenCount || 0,
            cached: !!cacheName,
            cachedTokens: response.usageMetadata?.cachedContentTokenCount || 0,
            isHit,
            baseline: baselineTokens,
            skippedSize: !cacheName && !!useCache && baselineTokens < 32768
        }
    };
  } catch (error: any) {
    // If cache failed (e.g. 404), retry once without cache
    if (cacheName && (error.message?.includes("404") || error.message?.includes("not found"))) {
        console.warn("Cache 404 at Google. Retrying without cache...");
        // Clear broken cache from DB
        await prisma.file.update({
            where: { id: fileIds[0] },
            data: { cacheName: null, cacheExpiresAt: null }
        }).catch(() => {});

        return generateQuestions({ ...options, useCache: false });
    }
    throw error;
  }
};
