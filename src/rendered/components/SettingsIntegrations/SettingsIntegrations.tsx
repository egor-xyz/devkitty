import { Divider, MenuItem, Button } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { FoundEditor } from 'types/foundEditor';
import { FoundShell } from 'types/foundShell';

import { Root, Row } from './SettingsIntegrations.styles';

export const SettingsIntegrations = () => {
  const { editors, shells, selectedEditor, selectedShell, set } = useAppSettings();

  if (!editors[0] || !shells[0]) {
    return null;
  }

  return (
    <Root>
      <h2>Integrations</h2>
      <Divider />
      <h3>Editor</h3>

      <Row>
        <Select<FoundEditor>
          filterable={false}
          itemRenderer={(editor, { index, handleClick }) => (
            <MenuItem
              disabled={editor.editor === selectedEditor.editor}
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
          <Button rightIcon="caret-down">{selectedShell.shell}</Button>
        </Select>
      </Row>
    </Root>
  );
};
