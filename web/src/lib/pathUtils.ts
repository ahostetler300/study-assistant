// web/src/lib/pathUtils.ts
import { join } from 'path';

/**
 * Resolves a relative path to an absolute path within the project's processed content directory.
 * Assumes the application is run from the 'web' subdirectory of the project root.
 *
 * @param relativePath The path relative to the 'data/processed_content' directory (e.g., 'file_id.md').
 * @returns The absolute path to the file.
 */
export function resolveLocalPath(relativePath: string): string {
  // process.cwd() will be something like /home/hossbot/projects/study-assistant/web
  const projectRoot = join(process.cwd(), '..'); // /home/hossbot/projects/study-assistant
  const processedContentDir = join(projectRoot, 'data', 'processed_content');
  return join(processedContentDir, relativePath);
}

/**
 * Given an absolute path, returns the path relative to the 'data/processed_content' directory.
 * This is primarily for a one-time database migration of old absolute paths to relative paths.
 *
 * @param absolutePath The absolute path to the file.
 * @returns The path relative to 'data/processed_content' (e.g., 'file_id.md').
 */
export function getRelativePath(absolutePath: string): string {
  const projectRoot = join(process.cwd(), '..');
  const processedContentDir = join(projectRoot, 'data', 'processed_content');
  
  // Normalize paths to ensure consistent separators (especially important for Windows compatibility)
  const normalizedAbsolutePath = join('/', absolutePath); // Ensure leading slash for join consistency
  const normalizedProcessedContentDir = join('/', processedContentDir); // Ensure leading slash

  if (normalizedAbsolutePath.startsWith(normalizedProcessedContentDir)) {
    return normalizedAbsolutePath.substring(normalizedProcessedContentDir.length + 1); // +1 for the separator
  }
  
  // Fallback or error handling if the path doesn't conform
  console.warn(`Absolute path ${absolutePath} does not seem to be within the expected processed content directory.`);
  return absolutePath; // Return original if not convertible
}
