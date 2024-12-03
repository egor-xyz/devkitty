import { Button, Classes, DialogBody, InputGroup } from '@blueprintjs/core';
import { ChangeEventHandler, FC, useState } from 'react';

import { appToaster } from 'rendered/utils/appToaster';
import { ModalProps } from 'types/Modal';

import { Actions, Error, StyledDialog } from './TrayStickerModal.styles';

export const TrayStickerModal: FC<ModalProps> = ({ onClose, darkMode, isOpen }) => {
  const [text, setText] = useState<string>('');
  const [error, setError] = useState<string | undefined>();

  const handleChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    setText(value);
  };

  const handleSave = async () => {
    setError(undefined);

    if (text.trim().length < 1) {
      setError('Sticker text is required');
      return;
    }

    window.bridge.sticker.add(text);

    (await appToaster).show({
      intent: 'success',
      message: `Sticker added!`
    });

    onClose();
  };

  return (
    <StyledDialog
      className={darkMode && Classes.DARK}
      icon="pin"
      isOpen={isOpen}
      title={'Add Tray Sticker'}
      onClose={onClose}
    >
      <DialogBody>
        <InputGroup
          autoFocus
          intent={error ? 'danger' : 'none'}
          placeholder="sticker text..."
          value={text}
          onChange={handleChange}
        />

        <Actions>
          <Button
            intent="warning"
            text={'Add'}
            onClick={handleSave}
          />

          {error && <Error>{error}</Error>}
        </Actions>
      </DialogBody>
    </StyledDialog>
  );
};
