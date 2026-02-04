import { Button, Divider, InputGroup, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { useState } from 'react';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { appToaster } from 'rendered/utils/appToaster';
import { type FoundEditor } from 'types/foundEditor';
import { type FoundShell } from 'types/foundShell';

export const SettingsIntegrations = () => {
  const { editors, gitHubToken, selectedEditor, selectedShell, set, shells } = useAppSettings();
  const [token, setToken] = useState(gitHubToken);

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
