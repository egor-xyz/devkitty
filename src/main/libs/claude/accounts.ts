import fs from 'fs';
import os from 'os';
import path from 'path';
import { type ClaudeAccount, type ClaudeDetection } from 'types/claudeUsage';

import { execAsync } from '../childProcess';
import { LOOKBACK_MS } from './usage';

/**
 * Whether the `claude` CLI resolves on PATH (fixPath has already made PATH
 * Homebrew-aware by the time this runs). A rejected exec means not installed.
 */
export const detectClaudeCli = async (): Promise<ClaudeDetection> => {
  try {
    const out = await execAsync('claude --version');
    const [version] = String(out).trim().split(/\s+/);
    return { installed: true, version };
  } catch {
    return { installed: false };
  }
};

const labelFromDir = (dir: string) => path.basename(dir).replace(/^\./, '');

// Best-effort account email. Different config dirs store it in different
// places, so try the in-dir config then the sibling top-level json.
const PLAN_LABELS: Record<string, string> = {
  default_claude_max_5x: 'Max 5×',
  default_claude_max_20x: 'Max 20×',
  default_claude_pro: 'Pro'
};

const prettyPlan = (tier: unknown): string | undefined => {
  if (typeof tier !== 'string') return undefined;
  return PLAN_LABELS[tier] ?? tier.replace(/^default_claude_/, '').replace(/_/g, ' ');
};

type Profile = { email?: string; org?: string; plan?: string };

// Reads the account's public profile (org, email, plan) from the config dir's
// .claude.json — the same file Claude Code itself reads, zero network cost.
const readProfile = (dir: string): Profile => {
  const candidates = [path.join(dir, '.claude.json'), `${dir}.json`];

  for (const file of candidates) {
    try {
      const oa = JSON.parse(fs.readFileSync(file, 'utf8'))?.oauthAccount;
      if (!oa) continue;

      const email = typeof oa.emailAddress === 'string' ? oa.emailAddress : undefined;
      const org = oa.organizationName || oa.displayName || oa.fullName || undefined;
      return { email, org, plan: prettyPlan(oa.userRateLimitTier) };
    } catch {
      // missing or unreadable — try the next candidate
    }
  }

  return {};
};

// An account is only worth showing if it has been used inside the lookback
// window — an installed-but-dormant config dir (e.g. a bedrock profile) would
// otherwise sit in the switcher forever reading 0%.
const hasRecentActivity = (dir: string): boolean => {
  const projectsDir = path.join(dir, 'projects');
  const cutoff = Date.now() - LOOKBACK_MS;

  let projects: string[] = [];
  try {
    projects = fs.readdirSync(projectsDir);
  } catch {
    return false;
  }

  for (const project of projects) {
    let files: string[] = [];
    try {
      files = fs.readdirSync(path.join(projectsDir, project));
    } catch {
      continue;
    }

    for (const name of files) {
      if (!name.endsWith('.jsonl')) continue;
      try {
        if (fs.statSync(path.join(projectsDir, project, name)).mtimeMs >= cutoff) return true;
      } catch {
        // unreadable file — keep looking
      }
    }
  }

  return false;
};

/**
 * Every `~/.claude*` directory that holds a `projects/` folder is treated as a
 * usable account (the default `.claude`, plus siblings like `.claude-b`).
 * Sorted so the default `.claude` comes first, then alphabetically.
 */
export const discoverAccounts = (home = os.homedir()): ClaudeAccount[] => {
  let names: string[] = [];

  try {
    names = fs.readdirSync(home);
  } catch {
    return [];
  }

  return names
    .filter((name) => name === '.claude' || name.startsWith('.claude-'))
    .map((name) => path.join(home, name))
    .filter((dir) => {
      try {
        return fs.statSync(dir).isDirectory() && hasRecentActivity(dir);
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      if (path.basename(a) === '.claude') return -1;
      if (path.basename(b) === '.claude') return 1;
      return a.localeCompare(b);
    })
    .map((dir) => ({ dir, label: labelFromDir(dir), ...readProfile(dir) }));
};
