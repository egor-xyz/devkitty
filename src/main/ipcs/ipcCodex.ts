import { ipcMain } from 'electron';
import { type AIAccount } from 'types/aiUsage';

import { aiUsageSecrets } from '../libs/aiUsage/secrets';
import { detectCodexCli, discoverAccounts } from '../libs/codex/accounts';
import { getCodexAdminUsage } from '../libs/codex/adminUsage';
import { buildUsage } from '../libs/codex/getUsage';
import { settings } from '../settings';

ipcMain.handle('codex:detect', () => detectCodexCli());
ipcMain.handle('codex:accounts', () => discoverAccounts());
ipcMain.handle('codex:usage', async (_event, account: AIAccount) => {
  if (account?.provider !== 'codex' || typeof account.dir !== 'string') throw new Error('Invalid Codex account');
  const discovered = discoverAccounts().find(({ dir }) => dir === account.dir);
  if (!discovered) throw new Error('Codex account is no longer available');
  const now = Date.now();
  const local = await buildUsage(discovered, now);
  const key = aiUsageSecrets.get('openai');
  if (!key) return local;
  try {
    const admin = await getCodexAdminUsage(key, settings.get('appSettings').openAIUsageProjectId, now);
    return { ...local, metrics: [...local.metrics, admin.metric], spend: admin.spend };
  } catch {
    return local;
  }
});
