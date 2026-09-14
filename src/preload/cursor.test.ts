import { type AIAccount } from 'types/aiUsage';
import { expect, it, vi } from 'vitest';

import { type Bridge } from './index';

const { exposeInMainWorld, invoke } = vi.hoisted(() => ({ exposeInMainWorld: vi.fn(), invoke: vi.fn() }));
vi.mock('electron', () => ({ contextBridge: { exposeInMainWorld }, ipcRenderer: { invoke } }));

await import('./index');
const [, bridge] = exposeInMainWorld.mock.calls[0] as [string, Bridge];

it('routes Cursor as one provider', () => {
  const account: AIAccount = { dir: '/cursor/globalStorage', label: 'Cursor', provider: 'cursor', surfaces: ['ide', 'cli'] };
  bridge.cursor.detect();
  bridge.cursor.accounts();
  bridge.cursor.usage(account);
  expect(invoke.mock.calls).toEqual([['cursor:detect'], ['cursor:accounts'], ['cursor:usage', account]]);
});
