import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { GoogleAICacheManager } from "@google/generative-ai/server";
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

interface GenerateOptions {
    contents: Part[];
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

const MAX_CACHE_TOKENS = 2048;

export const generateQuestions = async (options: GenerateOptions): Promise<AIResult> => {
  const { contents, prompt, useCache, fileIds } = options;
  const apiKey = await getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const cacheManager = new GoogleAICacheManager(apiKey, { apiVersion: 'v1beta' });
  
  const modelSetting = await prisma.systemSetting.findUnique({ where: { key: "gemini_model" } });
  const modelName = modelSetting?.value || "gemini-2.5-flash";
  const fullModelName = modelName.startsWith("models/") ? modelName : `models/${modelName}`;

  const ttlSetting = await prisma.systemSetting.findUnique({ where: { key: "cache_ttl_minutes" } });
  const ttlMinutes = parseInt(ttlSetting?.value || "3");

  let cachedContentName: string | undefined;
  let isCacheHit = false;
  let baselineTokens = 0;

  // 1. Caching Logic
  if (fileIds.length > 0) {
    // Get all files to check their cache status
    const selectedFiles = await prisma.file.findMany({
        where: { id: { in: fileIds } }
    });

    // Check if ALL selected files have valid cachedContents
    const allFilesHaveValidCache = selectedFiles.every(file => 
        file.geminiCacheId && file.geminiCacheExpiresAt && file.geminiCacheExpiresAt > new Date()
    );

    // If all files are cached, use the cache ID of the first file for the request
    if (allFilesHaveValidCache && selectedFiles[0].geminiCacheId) {
        cachedContentName = selectedFiles[0].geminiCacheId;
        isCacheHit = true;
        console.log(`Using existing cached content ${cachedContentName} for selected files.`);
    }

    // If no valid cache for all files exists, and useCache is true, create new cachedContents
    if (!cachedContentName && useCache) {
        // Count tokens for the full content to see if it meets the threshold
        const modelForCounting = genAI.getGenerativeModel({ model: modelName });
        const { totalTokens } = await modelForCounting.countTokens({
            contents: [{
                role: 'user',
                parts: contents
            }, {
                role: 'user',
                parts: [{ text: prompt }]
            }]
        });
        
        baselineTokens = totalTokens;

        if (totalTokens >= MAX_CACHE_TOKENS) {
            console.log(`Context size ${totalTokens} meets threshold. Creating new cached content...`);
            try {
                // Create cached content with all parts combined
                const cachedContent = await cacheManager.create({
                    model: fullModelName,
                    displayName: `Cache for Study Set Files (${fileIds.join(',')})`,
                    contents: [{ role: 'user', parts: contents }], // Only cache the content parts
                });
                cachedContentName = cachedContent.name;
                
                // Update all selected files in DB with this new cache ID
                const cacheExpiresAtDate = cachedContent.expireTime ? new Date(cachedContent.expireTime) : null;
                for (const file of selectedFiles) {
                    await prisma.file.update({
                        where: { id: file.id },
                        data: {
                            geminiCacheId: cachedContent.name,
                            geminiCacheExpiresAt: cacheExpiresAtDate,
                        }
                    });
                }
            } catch (err: any) {
                console.error("Cached content creation failed:", err.message || err);
                // Fallback to non-cached request below
            }
        }
    }
  }

  // 2. Generate Content
  const finalModel = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
    }
  });

  try {
    const result = cachedContentName
        ? await finalModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            cachedContent: cachedContentName
          })
        : await finalModel.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    ...contents,
                    { text: prompt }
                ]
            }]
          });

    // If successful and we used a cachedContent, attempt a background TTL refresh
    if (cachedContentName && isCacheHit) {
        // Silent update - don't wait for it

        // Update DB expiration for the first file (assuming all files linked to this cache)
        if (fileIds.length > 0) {
            await prisma.file.updateMany({
                where: { id: { in: fileIds } },
                data: { geminiCacheExpiresAt: new Date(Date.now() + ttlMinutes * 60000) }
            }).catch(e => console.error("Failed to update cache expiration in DB:", e));
        }
    }
    
    const response = result.response;
    const isHit = response.usageMetadata?.cachedContentTokenCount ? response.usageMetadata.cachedContentTokenCount > 0 : false;
    console.log("AI Generation Usage Metadata:", JSON.stringify(response.usageMetadata, null, 2));

    return {
        text: response.text(),
        usage: {
            input: response.usageMetadata?.promptTokenCount || 0,
            output: response.usageMetadata?.candidatesTokenCount || 0,
            cached: !!cachedContentName,
            cachedTokens: response.usageMetadata?.cachedContentTokenCount || 0,
            isHit: isCacheHit,
            baseline: baselineTokens,
            skippedSize: !cachedContentName && !!useCache && baselineTokens < MAX_CACHE_TOKENS
        }
    };
  } catch (error: any) {
    // If cache failed (e.g. 404), retry once without cache
    if (cachedContentName && (error.message?.includes("404") || error.message?.includes("not found"))) {
        console.warn("Cached content 404 at Google. Retrying without cache...");
        // Clear broken cache from DB for all files linked to this cache
        if (fileIds.length > 0 && cachedContentName) {
            await prisma.file.updateMany({
                where: { geminiCacheId: cachedContentName },
                data: { geminiCacheId: null, geminiCacheExpiresAt: null }
            }).catch(e => console.error("Failed to clear broken cache from DB:", e));
        }

        return generateQuestions({ ...options, useCache: false });
    }
    throw error;
  }
};

export const rewritePrompt = async (prompt: string): Promise<string | null> => {
  try {
    const apiKey = await getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    // Use the model configured in settings
    const modelSetting = await prisma.systemSetting.findUnique({ where: { key: "gemini_model" } }); 
    const modelName = modelSetting?.value || "gemini-2.5-flash"; 

    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        maxOutputTokens: 8192,
      }
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error rewriting prompt with Gemini:", error);
    return null;
  }
};
