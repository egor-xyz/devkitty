import { promises as fs } from 'fs';
import path from 'path';
/**
 * Read application bundles from the given directory.
 *
 * This implementation avoids spawning a shell and works cross platform.
 */
const getDirectoryContents = async (directory: string): Promise<string[]> => {
  const entries = await fs.readdir(directory);
  return entries.map((name) => path.join(directory, name));
};

export const getInstalledApps = async (directory: string): Promise<string[]> => {
  try {
    return await getDirectoryContents(directory);
  } catch {
    return [];
  }
};
