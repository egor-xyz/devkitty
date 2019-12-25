import { Dispatch, FC, SetStateAction, useEffect, useMemo, useState } from 'react';
import { find } from 'lodash';
import { Button, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';

import { JenkinsJob, JenkinsServer, useJenkinsStore } from 'modules/Jenkins';
import { useModalsStore } from 'modals';

import css from './SelectServer.module.scss';

interface Props {
  job: JenkinsJob;
  onSave():void;
  setJob: Dispatch<SetStateAction<JenkinsJob>>;
}

export const SelectServer: FC<Props> = ({ job, setJob, onSave }) => {
  const { servers } = useJenkinsStore();
  const { openModal } = useModalsStore();

  const _server = find(servers, { id: job.id }) ?? servers[0];
  const [server, setServer] = useState<JenkinsServer | undefined>(_server);

  useEffect(() => {
    if(!job.serverId && !!servers.length) {
      setJob({
        ...job,
        serverId: servers[0].id
      });
    }
  }, []); // eslint-disable-line

  return useMemo(() => {
    return (<>
      <div className={css.title}>{servers.length ? 'Choose' : 'Add'} Jenkins Server</div>

      {!servers.length && (
        <Button
          icon={'data-connection'}
          text={'Add Jenkins Server'}
          onClick={() => openModal({ name: 'jenkinsServer', prevModal: { name: 'jenkinsJob' } })}
        />
      )}

      {!!servers.length && (
        <Select
          activeItem={server}
          itemRenderer={({ name, id, domain }, { modifiers: { active }, handleClick }) => (
            <MenuItem
              active={active}
              key={id}
              text={`${name} - ${domain}`}
              onClick={handleClick}
            />
          )}
          items={servers}
          onItemSelect={server => {
            setServer(server);
            setJob({
              ...job,
              serverId: server.id
            });
          }}
        >
          <Button
            rightIcon='data-connection'
            text={server ? `${server.name} ${server.domain}` : 'Choose Server'}
          />
        </Select>
      )}

      <div className={css.actions}>
        <Button
          disabled={!server}
          intent={'primary'}
          text={'Next'}
          onClick={onSave}
        />
      </div>
    </>);
  }, [job, server]) // eslint-disable-line
};