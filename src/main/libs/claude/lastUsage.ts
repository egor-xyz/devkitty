import fs from 'fs';
import path from 'path';

export type ReportedUsage = {
  capturedAt: number; // epoch ms
  fiveHour?: ReportedWindow;
  sevenDay?: ReportedWindow;
};

export type ReportedWindow = {
  pct: number; // 0..1
  resetsAt: number; // epoch ms
};

const toMs = (epochSeconds: unknown): number => {
  if (typeof epochSeconds === 'number') return epochSeconds * 1000;
  if (typeof epochSeconds === 'string') {
    const parsed = Date.parse(epochSeconds);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const toWindow = (raw: unknown): ReportedWindow | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as { resets_at?: unknown; used_percentage?: unknown };
  if (typeof o.used_percentage !== 'number') return undefined;
  return {
    pct: Math.max(0, Math.min(1, o.used_percentage / 100)),
    resetsAt: toMs(o.resets_at)
  };
};

/**
 * The real, server-reported usage limits — written by the user's statusline
 * (which Claude Code hands `rate_limits` on stdin) to `<configDir>/last-usage.json`.
 * This is the authoritative source; returns null when the file is absent (the
 * statusline hasn't run yet for this account) so callers can fall back to the
 * local-transcript estimate.
 */
export const readReportedUsage = (configDir: string): null | ReportedUsage => {
  try {
    const raw = fs.readFileSync(path.join(configDir, 'last-usage.json'), 'utf8');
    const json = JSON.parse(raw);
    const rl = json?.rate_limits;
    if (!rl) return null;

    const fiveHour = toWindow(rl.five_hour);
    const sevenDay = toWindow(rl.seven_day);
    if (!fiveHour && !sevenDay) return null;

    return { capturedAt: toMs(json.capturedAt), fiveHour, sevenDay };
  } catch {
    return null;
  }
};
