import { FC, useState } from 'react';
import { Button, Divider, FileInput, Switch } from '@blueprintjs/core';

import { useTranslateStore } from 'modules/Translate/context';
import { msg } from 'utils/Msg';
import { TRANSLATE_PRIVATE_KEY } from 'modules/Translate/utils';
import { setPassword } from 'utils';
import { GoogleApiCreds } from 'modules/Translate/types';

import css from './TranslateSettingsPanel.module.scss';

export const TranslateSettingsPanel: FC = () => {
  const { isActive, setState, clientEmail, privateKey } = useTranslateStore();

  const [email, setEmail] = useState(clientEmail);
  const [key, setKey] = useState(privateKey);
  const [touched, setTouched] = useState(false);

  const [fileName, setFileName] = useState<string>();

  const onSave = () => {
    if (!email?.trim().length || !key?.trim().length) {
      msg.show({
        icon: 'key',
        intent: 'warning',
        message: 'Please Fill Google API Credentials',
        timeout: 2000
      });
      return;
    }

    // Save token
    setPassword(TRANSLATE_PRIVATE_KEY, key);

    // Update settings
    setState({
      clientEmail: email,
      privateKey: TRANSLATE_PRIVATE_KEY
    });

    setTouched(false);

    msg.show({
      icon: 'key',
      intent: 'success',
      message: 'Google API Credentials Saved',
      timeout: 2000
    });

    setFileName(undefined);
  };

  const checkCredentials = (creds: GoogleApiCreds) => {
    if (!creds.client_email || !creds.private_key) {
      setFileName(undefined);
      return;
    }
    setEmail(creds.client_email);
    setKey(creds.private_key);
    setTouched(true);
  };

  const onFileChange = (files: File[]) => {
    const file = files[0];
    if(!file) return;

    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      if (!fileReader.result) return;
      try{
        const credentials = JSON.parse(fileReader.result as string);
        checkCredentials(credentials);
        setFileName(files[0].name);
      } catch {
        console.log('error');
        setFileName(undefined);
      }
    };
    fileReader.readAsText(file);
  };

  return (<>
    <div className={css.sectionHeader}>Module settings</div>

    <Switch
      checked={isActive}
      inline={true}
      label={`Translate is ${isActive ? 'enabled' : 'disabled'}`}
      large={true}
      onChange={() => setState({ isActive: !isActive })}
    />

    <Divider className={css.divider} />

    <div className={css.sectionHeader}>
      Google API Credentials
    </div>
    <div className={css.sectionDesc}>
      Your credentials will be save to the system Keychain storage
    </div>

    <FileInput
      className={css.input}
      fill={true}
      inputProps={{
        onClick: (e: any) => e.target.value = ''
      }}
      text={fileName ?? (key
        ? '[ Key Saved to Keychain ]'
        : 'Choose credentials file...'
      )}
      onChange={(e: any) => onFileChange(e.target.files)}
    />

    <div className={css.actions}>
      <Button
        disabled={!touched}
        intent={'primary'}
        text={'Save'}
        onClick={onSave}
      />
    </div>
  </>);
};