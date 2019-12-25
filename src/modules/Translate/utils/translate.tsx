import { clipboard, remote } from 'electron';
import Linkify from 'react-linkify';

import { msg } from 'utils/Msg';
import { ModalsStore } from 'modals/context';
import { getPassword } from 'utils';

import css from './translate.module.scss';

const { Translate } = remote.require('@google-cloud/translate').v2;

let busy = false;
export const translateClipboard = async (
  client_email: string,
  privateKeyName: string,
  openModal: ModalsStore['openModal']
) => {
  if(busy) return;
  busy = true;

  const text = clipboard.readText();
  if (!text?.trim().length) {
    msg.show({
      icon: 'translate',
      intent: 'warning',
      message: 'Clipboard is empty',
    });
    busy = false;
    return;
  }

  try {
    const private_key = await getPassword(privateKeyName);
    if (!private_key) {
      msg.show({
        icon: 'translate',
        intent: 'danger',
        message: 'Google API credential are missed in the system Keychain'
      });
      busy = false;
      return;
    }

    const translate = new Translate({ credentials: { client_email, private_key } });
    const [translations] = await translate.translate(text, 'en');

    msg.show({
      icon: 'translate',
      message: (<div className={css.translated}>
        <Linkify>{translations}</Linkify>
      </div>),
    });
    busy = false;
  } catch (error) {
    openModal({ data: error, name: 'console' });
    busy = false;
  }
};