import { createElement } from 'react';
import { ContextMenu, Divider, Menu, MenuItem } from '@blueprintjs/core';
import { darkMode } from 'electron-util';

import { JenkinsJob } from 'modules/Jenkins/models';
import { openExternalURL } from 'utils';
import { AppStoreState } from 'context';
import { Group } from 'models';

type Props = (
  e: any,
  job: JenkinsJob,
  groups: AppStoreState['groups'],
  deleteJob: () => void,
  setGroup: (group?: Group) => void
) => void;

export const onJenkinsJobCardMenu: Props = (e, job, groups, deleteJob, setGroup) => {
  const menu = createElement(
    Menu,
    {},
    <MenuItem
      icon='document-open'
      text='Open on Web'
      onClick={() => openExternalURL(job?.url)}
    />,
    <Divider />,
    // !job.group && !!groups.length && (
    //   <MenuItem
    //     icon={'bookmark'}
    //     text={'Add to group'}
    //   >
    //     {groups.map(({ id, icon, name }) => (
    //       <MenuItem
    //         icon={icon ?? 'bookmark'}
    //         key={id}
    //         text={name}
    //         onClick={() => setGroup({ icon, id, name })}
    //       />
    //     ))}
    //   </MenuItem>
    // ),
    // job.group && (
    //   <MenuItem
    //     icon={job.group.icon ?? 'minus'}
    //     text={`Remove from ${job.group.name}`}
    //     onClick={() => setGroup()}
    //   />
    // ),
    // <Divider />,
    <MenuItem
      icon='trash'
      intent={'danger'}
      text='Remove Job'
      onClick={deleteJob}
    />,
  );

  ContextMenu.show(menu, { left: e.clientX, top: e.clientY }, () => { }, darkMode.isEnabled);
};