import { Button, InputGroup, MenuItem, Switch } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { appToaster } from 'renderer/utils/appToaster';
import { type FoundEditor } from 'types/foundEditor';
import { type FoundShell } from 'types/foundShell';

export const SettingsIntegrations = () => {
  const { claudeEnabled, editors, gitHubToken, selectedEditor, selectedShell, set, shells, telemetry } = useAppSettings();
  const [token, setToken] = useState(gitHubToken ?? '');

  const saveToken = async () => {
    await set({ gitHubToken: token }, true);

    (await appToaster).show({
      icon: 'tick',
      intent: 'success',
      message: 'GitHub Token saved'
    });
  };

  return (
    <div className="select-none">
      <h2 className="text-[18px] leading-6 font-semibold">Integrations</h2>

      <div className="mt-5 space-y-6">
        <div>
          <h3 className="text-sm leading-5 font-semibold">GitHub Token</h3>
          <p className="mt-1.5 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">Use a GitHub token to connect Devkitty to your account.</p>

          <div className="mt-3 flex max-w-[320px] flex-col items-start gap-2.5">
            <InputGroup
              className="w-full"
              inputMode="text"
              onChange={({ target: { value } }) => setToken(value)}
              placeholder="GitHub Token"
              type="password"
              value={token}
            />

            <Button
              intent="warning"
              onClick={saveToken}
              text={'Set GitHub Token'}
            />
          </div>
        </div>

        {editors.length !== 0 && Boolean(selectedEditor) && (
          <div>
            <h3 className="text-sm leading-5 font-semibold">Editor</h3>
            <p className="mt-1.5 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">Open project files with this editor.</p>

            <div className="mt-3">
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
          </div>
        )}

        {shells.length !== 0 && Boolean(selectedShell) && (
          <div>
            <h3 className="text-sm leading-5 font-semibold">Shell</h3>
            <p className="mt-1.5 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">Run project commands with this shell.</p>

            <div className="mt-3">
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
          </div>
        )}

        <section>
          <h3 className="mb-3 text-sm leading-5 font-semibold">AI Analytics</h3>

          <Switch
            checked={claudeEnabled ?? true}
            className="!mb-0"
            label="AI usage integration"
            onChange={() => set({ claudeEnabled: !(claudeEnabled ?? true) })}
          />

          <p className="mt-1.5 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">Scan Claude Code, Codex, and Cursor. Cursor IDE and CLI use one account meter.</p>
        </section>

        <section>
          <h3 className="mb-3 text-sm leading-5 font-semibold">Google Analytics</h3>

          <Switch
            checked={telemetry !== false}
            className="!mb-0"
            label="Share anonymous analytics"
            onChange={() => set({ telemetry: !(telemetry !== false) })}
          />

          <p className="mt-1.5 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">Help improve Devkitty by sharing anonymous feature usage and error diagnostics.</p>
        </section>
      </div>
    </div>
  );
};
