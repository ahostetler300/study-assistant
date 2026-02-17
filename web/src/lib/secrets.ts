import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const SECRETS_PATH = join(process.cwd(), ".secrets.env");

export async function saveSecret(key: string, value: string) {
  let content = "";
  try {
    content = await readFile(SECRETS_PATH, "utf8");
  } catch (error) {}

  const lines = content.split("\n");
  let found = false;
  const newLines = lines.map((line) => {
    if (line.trim().startsWith(`${key}=`)) {
      found = true;
      return `${key}="${value}"`;
    }
    return line;
  });

  if (!found) {
    newLines.push(`${key}="${value}"`);
  }

  await writeFile(SECRETS_PATH, newLines.join("\n"), "utf8");
}

export async function getSecretLive(key: string): Promise<string | undefined> {
  try {
    const content = await readFile(SECRETS_PATH, "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.trim().startsWith(`${key}=`)) {
        const parts = line.split("=");
        if (parts.length >= 2) {
          let val = parts.slice(1).join("=").trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          return val;
        }
      }
    }
  } catch (error) {}
  return undefined;
}
