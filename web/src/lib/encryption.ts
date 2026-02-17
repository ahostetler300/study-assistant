import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const SALT = "study-assistant-fixed-salt";

function getRawSecret(): string | undefined {
  // 1. Try process.env (Next.js standard)
  if (process.env.SETTINGS_SECRET) return process.env.SETTINGS_SECRET;

  // 2. Try reading .env.local directly (for hot-swapping/first-run compatibility)
  try {
    const envPath = join(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf8");
    const match = content.match(/^SETTINGS_SECRET=["']?(.*?)["']?$/m);
    if (match) return match[1];
  } catch (e) {
    // File doesn't exist or unreadable
  }

  return undefined;
}

function getDerivedKey() {
  const secret = getRawSecret();
  if (!secret) {
    throw new Error("SETTINGS_SECRET environment variable is not defined");
  }
  return scryptSync(secret, SALT, KEY_LENGTH);
}

export function encrypt(text: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encryptedData.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Invalid encrypted data format");
  }

  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function isSecretConfigured(): boolean {
  return !!getRawSecret();
}
