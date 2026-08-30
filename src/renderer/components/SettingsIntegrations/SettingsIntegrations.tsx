import { Button, Divider, InputGroup, MenuItem, Switch } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { appToaster } from 'renderer/utils/appToaster';
import { type FoundEditor } from 'types/foundEditor';
import { type FoundShell } from 'types/foundShell';

export const SettingsIntegrations = () => {
  const { claudeEnabled, editors, gitHubToken, selectedEditor, selectedShell, set, shells } = useAppSettings();
  const [token, setToken] = useState(gitHubToken ?? '');

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

      <h3 className="text-sm font-semibold mt-4 mb-2.5">Claude Code</h3>

      <Switch
        checked={claudeEnabled ?? true}
        label="Usage integration"
        onChange={() => set({ claudeEnabled: !(claudeEnabled ?? true) })}
      />

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
    </div>
  );
};
