import { type AIAccount } from 'types/aiUsage';
import { expect, it, vi } from 'vitest';

import { type Bridge } from './index';

const { exposeInMainWorld, invoke } = vi.hoisted(() => ({ exposeInMainWorld: vi.fn(), invoke: vi.fn() }));
vi.mock('electron', () => ({ contextBridge: { exposeInMainWorld }, ipcRenderer: { invoke } }));

await import('./index');
const [, bridge] = exposeInMainWorld.mock.calls[0] as [string, Bridge];

it('routes Codex discovery and profile usage through its IPC namespace', () => {
  const account: AIAccount = { dir: '/tmp/.codex-work', label: 'codex-work', provider: 'codex' };
  bridge.codex.detect();
  bridge.codex.accounts();
  bridge.codex.usage(account);
  expect(invoke.mock.calls).toEqual([
    ['codex:detect'], ['codex:accounts'], ['codex:usage', account]
  ]);
});
