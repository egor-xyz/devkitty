import path from 'path';

import fs from 'fs-extra';

export const getNodeVersion = async (projectPath: string): Promise<string | undefined> => {
  let nodeVersion;
  try {
    nodeVersion = await fs.readFile(path.join(projectPath, '.nvmrc'), 'utf8');
  } catch { /**/ }
  if (!nodeVersion) return;
  return nodeVersion;
};