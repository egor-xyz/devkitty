import fs from 'fs';
import path from 'path';
import readline from 'readline';

import { LOOKBACK_MS, type UsageEntry } from './usage';

const parseLine = (line: string): null | UsageEntry => {
  if (!line || line[0] !== '{') return null;

  try {
    const json = JSON.parse(line);
    if (json?.type !== 'assistant') return null;

    const usage = json?.message?.usage;
    if (!usage) return null;

    const ts = Date.parse(json.timestamp);
    if (Number.isNaN(ts)) return null;

    const tokens =
      (usage.input_tokens ?? 0) +
      (usage.output_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0);

    if (tokens <= 0) return null;

    return {
      model: json?.message?.model ?? 'unknown',
      requestId: json?.requestId,
      tokens,
      ts
    };
  } catch {
    return null;
  }
};

const readFileEntries = (file: string): Promise<UsageEntry[]> =>
  new Promise((resolve) => {
    const entries: UsageEntry[] = [];
    const rl = readline.createInterface({ crlfDelay: Infinity, input: fs.createReadStream(file, 'utf8') });

    rl.on('line', (line) => {
      const entry = parseLine(line);
      if (entry) entries.push(entry);
    });
    rl.on('close', () => resolve(entries));
    rl.on('error', () => resolve(entries));
  });

const listTranscriptFiles = (projectsDir: string): string[] => {
  let projects: string[] = [];

  try {
    projects = fs.readdirSync(projectsDir);
  } catch {
    return [];
  }

  const files: string[] = [];

  for (const project of projects) {
    const dir = path.join(projectsDir, project);

    try {
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const name of fs.readdirSync(dir)) {
        if (name.endsWith('.jsonl')) files.push(path.join(dir, name));
      }
    } catch {
      // unreadable project dir — skip it
    }
  }

  return files;
};

/**
 * Reads every recent transcript under `<configDir>/projects` into usage
 * entries. Files untouched for longer than the weekly window are skipped up
 * front — they cannot contribute to either the 5h or 7d figure — which keeps
 * the scan cheap even with a large project history.
 */
export const readEntries = async (configDir: string, now: number): Promise<UsageEntry[]> => {
  const projectsDir = path.join(configDir, 'projects');
  const cutoff = now - LOOKBACK_MS;

  const recent = listTranscriptFiles(projectsDir).filter((file) => {
    try {
      return fs.statSync(file).mtimeMs >= cutoff;
    } catch {
      return false;
    }
  });

  const perFile = await Promise.all(recent.map(readFileEntries));
  return perFile.flat().filter((e) => e.ts >= cutoff);
};
