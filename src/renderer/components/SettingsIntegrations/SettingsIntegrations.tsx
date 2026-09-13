import { Button, Divider, InputGroup, MenuItem, Switch } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { useEffect, useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { appToaster } from 'renderer/utils/appToaster';
import { type FoundEditor } from 'types/foundEditor';
import { type FoundShell } from 'types/foundShell';

export const SettingsIntegrations = () => {
  const { anthropicUsageWorkspaceId, claudeEnabled, editors, gitHubToken, openAIUsageProjectId, selectedEditor, selectedShell, set, shells, telemetry } = useAppSettings();
  const [token, setToken] = useState(gitHubToken ?? '');
  const [adminKeys, setAdminKeys] = useState({ anthropic: '', openai: '' });
  const [savedKeys, setSavedKeys] = useState({ anthropic: false, openai: false });

  useEffect(() => {
    void window.bridge.aiUsageCredentials.status().then(setSavedKeys);
  }, []);

  const saveAdminKey = async (provider: 'anthropic' | 'openai') => {
    const value = adminKeys[provider].trim();
    if (!value) return;
    try {
      await window.bridge.aiUsageCredentials.set(provider, value);
      setAdminKeys((current) => ({ ...current, [provider]: '' }));
      setSavedKeys((current) => ({ ...current, [provider]: true }));
      (await appToaster).show({ icon: 'tick', intent: 'success', message: 'Admin key saved' });
    } catch (error) {
      (await appToaster).show({ icon: 'error', intent: 'danger', message: error instanceof Error ? error.message : 'Could not save admin key' });
    }
  };

  const clearAdminKey = async (provider: 'anthropic' | 'openai') => {
    await window.bridge.aiUsageCredentials.clear(provider);
    setSavedKeys((current) => ({ ...current, [provider]: false }));
  };

  // Dev-only demo mode. The preload picks the fake bridge at startup from this
  // flag, so flipping it has to reload the window to take effect.
  const readDemo = () => {
    try {
      return localStorage.getItem('dk-demo') === '1';
    } catch {
      return false;
    }
  };
  const [demoMode] = useState(readDemo);
  const toggleDemo = () => {
    try {
      localStorage.setItem('dk-demo', demoMode ? '0' : '1');
    } catch {
      /* ignore */
    }
    location.reload();
  };

  const saveToken = async () => {
    await set({ gitHubToken: token }, true);

    (await appToaster).show({
      icon: 'tick',
      intent: 'success',
      message: 'GitHub Token saved'
    });
  };

  return (
    <div className="select-none p-4">
      <h2 className="text-xl font-semibold mb-1">Integrations</h2>
      <Divider />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">GitHub Token</h3>

      <div className="flex flex-col gap-2.5 w-[200px]">
        <InputGroup
          inputMode="text"
          onChange={({ target: { value } }) => setToken(value)}
          placeholder="GitHub Token"
          type="password"
          value={token}
        />

        <Button
          intent="warning"
          onClick={saveToken}
          small
          text={'Set GitHub Token'}
        />
      </div>

      {import.meta.env.DEV && (
        <>
          <h3 className="text-sm font-semibold mt-4 mb-2.5">Developer</h3>

          <Switch
            checked={demoMode}
            label="Demo mode — fill app with fake data"
            onChange={toggleDemo}
          />

          <p className="text-[11px] text-bp-gray-2 -mt-1">Dev only. Reloads the window. Never available in a production build.</p>
        </>
      )}

      {editors.length !== 0 && Boolean(selectedEditor) && (
        <>
          <h3 className="text-sm font-semibold mt-4 mb-2.5">Editor</h3>

          <div className="flex items-center justify-between">
            <Select<FoundEditor>
              filterable={false}
              itemRenderer={(editor, { handleClick, index }) => (
                <MenuItem
                  disabled={editor.editor === selectedEditor?.editor}
                  key={index}
                  onClick={handleClick}
                  text={editor.editor}
                />
              )}
              items={editors}
              onItemSelect={(selectedEditor) => set({ selectedEditor })}
            >
              <Button rightIcon="caret-down">{selectedEditor?.editor}</Button>
            </Select>
          </div>
        </>
      )}

      {shells.length !== 0 && Boolean(selectedShell) && (
        <>
          <h3 className="text-sm font-semibold mt-4 mb-2.5">Shell</h3>

          <div className="flex items-center justify-between">
            <Select<FoundShell<string>>
              filterable={false}
              itemRenderer={(shell, { handleClick, index }) => (
                <MenuItem
                  disabled={shell.shell === selectedShell?.shell}
                  key={index}
                  onClick={handleClick}
                  text={shell.shell}
                />
              )}
              items={shells}
              onItemSelect={(selectedShell) => set({ selectedShell })}
            >
              <Button rightIcon="caret-down">{selectedShell?.shell}</Button>
            </Select>
          </div>
        </>
      )}

      <section className="mt-4">
        <h3 className="mb-2.5 text-sm font-semibold">AI Analytics</h3>

        <Switch
          checked={claudeEnabled ?? true}
          label="AI usage integration"
          onChange={() => set({ claudeEnabled: !(claudeEnabled ?? true) })}
        />

        <p className="text-xs text-bp-gray-1 dark:text-bp-gray-4">Scan Claude Code, Codex, and Cursor. Cursor IDE and CLI use one account meter.</p>

        <div className="mt-4 max-w-lg rounded border border-bp-light-gray-1 p-3 dark:border-bp-dark-gray-3">
          <h4 className="text-sm font-semibold">Optional API cost reports</h4>
          <p className="mt-1 text-xs text-bp-gray-1 dark:text-bp-gray-4">These admin keys have high access to your group. Devkitty encrypts them. The app never sends them to the screen.</p>

          <div className="mt-3 grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold"
                htmlFor="anthropic-admin-key"
              >Anthropic Admin API key</label>

              <div className="flex gap-2">
                <InputGroup autoComplete="off"
                  id="anthropic-admin-key"
                  onChange={({ target: { value } }) => setAdminKeys((current) => ({ ...current, anthropic: value }))}
                  placeholder={savedKeys.anthropic ? 'Saved' : 'sk-ant-admin…'}
                  type="password"
                  value={adminKeys.anthropic}
                />

                <Button disabled={!adminKeys.anthropic.trim()}
                  onClick={() => void saveAdminKey('anthropic')}
                  text="Save"
                />

                {savedKeys.anthropic && <Button onClick={() => void clearAdminKey('anthropic')}
                  text="Clear"
                                        />}
              </div>

              <label className="mb-1 mt-2 block text-xs"
                htmlFor="anthropic-workspace-id"
              >Workspace ID (optional)</label>

              <InputGroup id="anthropic-workspace-id"
                onChange={({ target: { value } }) => set({ anthropicUsageWorkspaceId: value || undefined })}
                placeholder="All org workspaces"
                value={anthropicUsageWorkspaceId ?? ''}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold"
                htmlFor="openai-admin-key"
              >OpenAI Admin API key</label>

              <div className="flex gap-2">
                <InputGroup autoComplete="off"
                  id="openai-admin-key"
                  onChange={({ target: { value } }) => setAdminKeys((current) => ({ ...current, openai: value }))}
                  placeholder={savedKeys.openai ? 'Saved' : 'sk-admin…'}
                  type="password"
                  value={adminKeys.openai}
                />

                <Button disabled={!adminKeys.openai.trim()}
                  onClick={() => void saveAdminKey('openai')}
                  text="Save"
                />

                {savedKeys.openai && <Button onClick={() => void clearAdminKey('openai')}
                  text="Clear"
                                     />}
              </div>

              <label className="mb-1 mt-2 block text-xs"
                htmlFor="openai-project-id"
              >Project ID (optional)</label>

              <InputGroup id="openai-project-id"
                onChange={({ target: { value } }) => set({ openAIUsageProjectId: value || undefined })}
                placeholder="All org projects"
                value={openAIUsageProjectId ?? ''}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <h3 className="mb-2.5 text-sm font-semibold">Google Analytics</h3>

        <Switch
          checked={telemetry !== false}
          label="Share anonymous analytics"
          onChange={() => set({ telemetry: !(telemetry !== false) })}
        />

        <p className="text-xs text-bp-gray-1 dark:text-bp-gray-4">Help improve Devkitty by sharing anonymous feature usage and error diagnostics.</p>
      </section>
    </div>
  );
};
