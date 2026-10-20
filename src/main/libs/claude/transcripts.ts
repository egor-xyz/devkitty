import fs from 'fs';
import path from 'path';
import readline from 'readline';

import { LOOKBACK_MS, type UsageEntry } from './usage';

const parseLine = (line: string): null | UsageEntry => {
  // Cheap prefilter: skip the JSON.parse for lines that cannot carry usage data.
  if (!line || line[0] !== '{' || !line.includes('"usage"')) return null;

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

type CachedFile = { entries: UsageEntry[]; modified: number; size: number };

// Per-file parse cache keyed by absolute path, so unchanged transcripts are not
// re-read on every poll. Follows codex/transcripts.ts.
const cache = new Map<string, CachedFile>();

export const resetTranscriptCache = (): void => cache.clear();

// `ok` is false when the stream errored, so the caller can avoid caching a partial read.
const readFileEntries = (file: string): Promise<{ entries: UsageEntry[]; ok: boolean }> =>
  new Promise((resolve) => {
    const entries: UsageEntry[] = [];
    const rl = readline.createInterface({ crlfDelay: Infinity, input: fs.createReadStream(file, 'utf8') });

    rl.on('line', (line) => {
      const entry = parseLine(line);
      if (entry) entries.push(entry);
    });
    rl.on('close', () => resolve({ entries, ok: true }));
    rl.on('error', () => resolve({ entries, ok: false }));
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

  const recent: { file: string; modified: number; size: number }[] = [];

  for (const file of listTranscriptFiles(projectsDir)) {
    try {
      const stat = fs.statSync(file);
      if (stat.mtimeMs >= cutoff) recent.push({ file, modified: stat.mtimeMs, size: stat.size });
    } catch {
      // vanished or unreadable — treat as not recent
    }
  }

  // Sequential reads keep at most one stream and one file's lines in flight.
  const perFile: UsageEntry[][] = [];

  for (const { file, modified, size } of recent) {
    const cached = cache.get(file);

    if (cached && cached.size === size && cached.modified === modified) {
      perFile.push(cached.entries);
      continue;
    }

    const { entries, ok } = await readFileEntries(file);
    // A failed read is returned for this poll but not cached, so the next poll retries.
    if (ok) cache.set(file, { entries, modified, size });
    perFile.push(entries);
  }

  // Prune files that dropped out of this scan, only within this configDir.
  const kept = new Set(recent.map((r) => r.file));
  const prefix = projectsDir + path.sep;

  for (const key of cache.keys()) {
    if (key.startsWith(prefix) && !kept.has(key)) cache.delete(key);
  }

  return perFile.flat().filter((e) => e.ts >= cutoff);
};
