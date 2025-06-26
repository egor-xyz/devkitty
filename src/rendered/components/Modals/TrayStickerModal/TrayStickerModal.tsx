import { Button, Classes, DialogBody, InputGroup } from '@blueprintjs/core';
import { type ChangeEventHandler, type FC, useState } from 'react';
import { appToaster } from 'rendered/utils/appToaster';
import { type ModalProps } from 'types/Modal';

import { Actions, Error, StyledDialog } from './TrayStickerModal.styles';

export const TrayStickerModal: FC<ModalProps> = ({ darkMode, isOpen, onClose }) => {
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
      onClose={onClose}
      title={'Add Tray Sticker'}
    >
      <DialogBody>
        <InputGroup
          autoFocus
          intent={error ? 'danger' : 'none'}
          onChange={handleChange}
          placeholder="sticker text..."
          value={text}
        />

        <Actions>
          <Button
            intent="warning"
            onClick={handleSave}
            text={'Add'}
          />

          {error && <Error>{error}</Error>}
        </Actions>
      </DialogBody>
    </StyledDialog>
  );
};
