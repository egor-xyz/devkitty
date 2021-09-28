import { clipboard, ipcRenderer } from 'electron';
import Linkify from 'react-linkify';

import { msg } from 'utils/Msg';
import { ModalsStore } from 'modals/context';
import { getPassword } from 'utils';

import css from './translate.module.scss';

let busy = false;
let prevText = '';
let prevResult: string | undefined;

export const translateClipboard = async (
  projectId: string,
  client_email: string,
  privateKeyName: string,
  openModal: ModalsStore['openModal']
) => {
  if (busy) return;
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

  if (text === prevText && prevResult) {
    msg.show({
      icon: 'translate',
      message: (<div className={css.translated}>
        <Linkify>{prevResult}</Linkify>
      </div>),
    });
    busy = false;
    return;
  }
  prevText = text;
  prevResult = undefined;

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

    ipcRenderer.invoke('translate', {
      lang: 'en',
      settings: { credentials: { client_email, private_key }, projectId },
      text: text,
    }).then((translations: string) => {
      msg.show({
        icon: 'translate',
        message: (<div className={css.translated}>
          <Linkify>{translations}</Linkify>
        </div>),
      });
      busy = false;
    });
  } catch (error) {
    openModal({ data: error, name: 'console' });
    busy = false;
  }
};