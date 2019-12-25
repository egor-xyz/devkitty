import { FC, useMemo } from 'react';
import { Button, ButtonGroup, Divider, Switch } from '@blueprintjs/core';
import { findIndex } from 'lodash';

import { useJenkinsStore } from 'modules/Jenkins/context';
import { useModalsStore } from 'modals';

import css from './JenkinsSettingsPanel.module.scss';

export const JenkinsSettingsPanel: FC = () => {
  const { isActive, setState, servers } = useJenkinsStore();
  const { openModal } = useModalsStore();

  const deleteConf = (id: string) => {
    const newServers = [...servers];
    const index = findIndex(newServers, { id });
    if (index === -1) return;
    newServers.splice(index, 1);
    setState({ servers: [...newServers] });
  };

  return useMemo(() => (<>
    <div className={css.sectionHeader}>Module settings</div>

    <Switch
      checked={isActive}
      inline={true}
      label={`Jenkins is ${isActive ? 'enabled' : 'disabled'}`}
      large={true}
      onChange={() => setState({ isActive: !isActive })}
    />

    {isActive && (<>
      <Divider className={css.divider} />

      <div className={css.sectionHeader}>Jenkins Server configurations</div>

      <div className={css.list}>
        {servers.map(server => (<div key={server.id}>
          <div className={css.item}>
            <span className={css.name}>{server.name}</span>
            <span className={css.domain}>{server.domain}</span>

            <ButtonGroup className={css.actions}>
              <Button
                className={css.removeConf}
                icon={'edit'}
                onClick={() => openModal({ data: server, name: 'jenkinsServer' })}
              />

              <Button
                icon={'trash'}
                onClick={() => deleteConf(server.id)}
              />
            </ButtonGroup>
          </div>

          <Divider className={css.divider} />
        </div>))}
      </div>

      <Button
        className={css.addBtn}
        icon={'plus'}
        text={'Add Jenkins Server'}
        onClick={() => openModal({ name: 'jenkinsServer' })}
      />
    </>)}
  </>), [isActive, servers]); // eslint-disable-line
};