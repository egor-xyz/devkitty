import { Divider, MenuItem, Button, InputGroup } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import { useState } from 'react';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { FoundEditor } from 'types/foundEditor';
import { FoundShell } from 'types/foundShell';
import { appToaster } from 'rendered/utils/appToaster';

import { Root, Row, TokenWrapper } from './SettingsIntegrations.styles';

export const SettingsIntegrations = () => {
  const { editors, shells, selectedEditor, selectedShell, set, gitHubToken } = useAppSettings();
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
          placeholder="GitHub Token"
          type="password"
          value={token}
          onChange={({ target: { value } }) => setToken(value)}
        />
        <Button
          small
          intent="warning"
          text={'Set GitHub Token'}
          onClick={saveToken}
        />
      </TokenWrapper>

      {editors.length !== 0 && Boolean(selectedEditor) && (
        <>
          <h3>Editor</h3>
          <Row>
            <Select<FoundEditor>
              filterable={false}
              itemRenderer={(editor, { index, handleClick }) => (
                <MenuItem
                  disabled={editor.editor === selectedEditor?.editor}
                  key={index}
                  text={editor.editor}
                  onClick={handleClick}
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
              itemRenderer={(shell, { index, handleClick }) => (
                <MenuItem
                  disabled={shell.shell === selectedShell?.shell}
                  key={index}
                  text={shell.shell}
                  onClick={handleClick}
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
