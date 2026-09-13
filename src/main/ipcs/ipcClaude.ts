import { ipcMain } from 'electron';
import { type ClaudeAccount } from 'types/claudeUsage';

import { aiUsageSecrets } from '../libs/aiUsage/secrets';
import { detectClaudeCli, discoverAccounts } from '../libs/claude/accounts';
import { getClaudeAdminUsage } from '../libs/claude/adminUsage';
import { buildUsage } from '../libs/claude/getUsage';
import { settings } from '../settings';

ipcMain.handle('claude:detect', () => detectClaudeCli());

ipcMain.handle('claude:accounts', () => discoverAccounts());

ipcMain.handle('claude:usage', async (_event, account: ClaudeAccount) => {
  if (!account || typeof account.dir !== 'string') throw new Error('Invalid Claude account');
  const discovered = discoverAccounts().find(({ dir }) => dir === account.dir);
  if (!discovered) throw new Error('Claude account is no longer available');
  const now = Date.now();
  const local = await buildUsage(discovered, now);
  const key = aiUsageSecrets.get('anthropic');
  if (!key) return local;
  try {
    const admin = await getClaudeAdminUsage(key, settings.get('appSettings').anthropicUsageWorkspaceId, now);
    return { ...local, metrics: [...local.metrics, admin.metric], spend: admin.spend };
  } catch {
    return local;
  }
});
