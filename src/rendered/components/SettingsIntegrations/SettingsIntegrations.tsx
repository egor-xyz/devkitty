import { Button, Divider, InputGroup, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { useState } from 'react';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { appToaster } from 'rendered/utils/appToaster';
import { type FoundEditor } from 'types/foundEditor';
import { type FoundShell } from 'types/foundShell';

import { Root, Row, TokenWrapper } from './SettingsIntegrations.styles';

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
    <Root>
      <h2>Integrations</h2>
      <Divider />
      <h3>GitHub Token</h3>

      <TokenWrapper>
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
      </TokenWrapper>

      {editors.length !== 0 && Boolean(selectedEditor) && (
        <>
          <h3>Editor</h3>

          <Row>
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
          </Row>
        </>
      )}

      {shells.length !== 0 && Boolean(selectedShell) && (
        <>
          <h3>Shell</h3>

          <Row>
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
          </Row>
        </>
      )}
    </Root>
  );
};
