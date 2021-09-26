import { FC, useCallback } from 'react';
import { Button, NavbarDivider } from '@blueprintjs/core';

import { translateClipboard, useTranslateStore } from 'modules/Translate';
import { useModalsStore } from 'modals/context';

export const TranslateButton: FC = () => {
  const { isActive, privateKey, clientEmail, projectId } = useTranslateStore();
  const { openModal } = useModalsStore();

  const translate = useCallback(() => {
    translateClipboard(projectId, clientEmail, privateKey, openModal);
  }, [projectId, clientEmail, privateKey, openModal]);

  if (!isActive) return null;

  return (<>
    <NavbarDivider />
    <Button
      icon={'translate'}
      minimal={true}
      title='Translate'
      onClick={translate}
    />
  </>);
};