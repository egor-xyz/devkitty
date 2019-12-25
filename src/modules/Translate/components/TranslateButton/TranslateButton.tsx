import { FC, useMemo } from 'react';
import { Button, NavbarDivider } from '@blueprintjs/core';

import { translateClipboard, useTranslateStore } from 'modules/Translate';
import { useModalsStore } from 'modals/context';

export const TranslateButton: FC = () => {
  const { isActive, privateKey, clientEmail } = useTranslateStore();
  const { openModal } = useModalsStore();
  return useMemo(() => {
    if (!isActive) return null;
    return (<>
      <NavbarDivider />
      <Button
        icon={'translate'}
        minimal={true}
        title='Translate'
        onClick={() => translateClipboard(clientEmail, privateKey, openModal)}
      />
    </>);
  }, [isActive, privateKey, clientEmail]); // eslint-disable-line
};