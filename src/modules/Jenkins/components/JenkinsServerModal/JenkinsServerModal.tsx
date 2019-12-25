import { ChangeEvent, FC, useState } from 'react';
import { v4 } from 'uuid';
import { find } from 'lodash';
import { Button, InputGroup, Spinner } from '@blueprintjs/core';

import { JenkinsServer, useJenkinsStore } from 'modules/Jenkins/context';
import { getJenkinsServerTokenName, msg , setPassword } from 'utils';
import { checkJenkinsCredentials } from 'modules/Jenkins/api';
import { useModalsStore } from 'modals';

import css from './JenkinsServerModal.module.scss';

const defServer: JenkinsServer = {
  domain: '',
  id: v4(),
  name: '',
  token: '',
  user: ''
};

export const JenkinsServerModal: FC = () => {
  const { servers, setState } = useJenkinsStore();
  const { closeModal, data } = useModalsStore();

  const [server, setServer] = useState<JenkinsServer>(data ? { ...data } : { ...defServer });
  const [tmpToken, setTmpToken] = useState<string>(data?.token ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const { user, domain, id, name } = server;

  const onSave = async () => {
    if (isLoading) return;

    if (!tmpToken?.trim() || !user?.trim() || !domain?.trim() || !name.trim()) {
      msg.show({
        icon: 'key',
        intent: 'warning',
        message: 'Please Fill Jenkins Credentials',
        timeout: 2000
      });
      return;
    }

    setIsLoading(true);
    const res = await checkJenkinsCredentials(server, tmpToken);
    if (!res) {
      msg.show({
        icon: 'key',
        intent: 'warning',
        message: 'Wrong Jenkins Credentials',
        timeout: 2000
      });
      setIsLoading(false);
      return;
    }

    if (data) {
      setPassword(getJenkinsServerTokenName(id), tmpToken);
      const newServers = [...servers];
      let server = find(newServers, { id: data.id });
      if (!server) {
        closeModal();
        return;
      }
      server.user = user;
      server.domain = domain;
      server.name = name;
      setState({ servers: [...newServers] });
      closeModal();
      return;
    }

    setPassword(getJenkinsServerTokenName(id), tmpToken);
    server.token = getJenkinsServerTokenName(id);
    setState({
      servers: [
        ...servers,
        { ...server }
      ]
    });
    closeModal();
  };

  return (<div className={css.root}>
    <div className={css.title}>
      Add your Jenkins Server Credentials (saved in system keychain).
    </div>

    <div className={css.row}>
      <InputGroup
        leftIcon={'settings'}
        placeholder={'Configuration name'}
        value={name ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setServer({
          ...server,
          name: e.target?.value ?? ''
        })}
      />
    </div>

    <InputGroup
      className={css.row}
      placeholder={'Jenkins domain: https://....'}
      value={domain ?? ''}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setServer({
        ...server,
        domain: e.target?.value ?? ''
      })}
    />

    <div className={css.row}>
      <InputGroup
        placeholder={'User name'}
        value={user ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setServer({
          ...server,
          user: e.target?.value ?? ''
        })}
      />

      <InputGroup
        placeholder={'Token'}
        type={'password'}
        value={tmpToken ?? ''}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTmpToken(e.target?.value ?? '')}
      />
    </div>

    <div className={css.actions}>
      <Button
        intent={'primary'}
        text={!data ? 'Add' : 'Save'}
        onClick={onSave}
      />
    </div>

    {isLoading && (
      <div className={css.spinner}>
        <Spinner />
      </div>
    )}
  </div>);
};