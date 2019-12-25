import { FC, useState } from 'react';
import { find } from 'lodash';
import { Button, Classes, Icon, ProgressBar } from '@blueprintjs/core';

import { useAppStore, useAppStoreDispatch } from 'context';
import { Project } from 'models';
import { createPullRequest } from 'utils';
import { BranchSelect } from 'components/BranchSelect';
import { Root } from 'modals/components/PullRequestModal/PullRequestModal.styles';
import { useModalsStore } from 'modals/context';

interface State {
  from?: string;
  fromQuery?: string;
  loading?: boolean;
  to?: string;
  toQuery?: string;
}

export const PullRequestModal: FC = () => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();
  const [_state, setState] = useState<State>({});
  const { data, closeModal } = useModalsStore();

  const { projects, appStatus } = state;

  const project = find<Project>(projects, { repo: data });
  if (!project) return null;

  const { branch } = project;
  if (!_state.from && branch.current) {
    setState({
      ..._state,
      from: branch.current,
    });
  }

  return (<Root>
    <div className={Classes.DIALOG_BODY}>
      {!_state.loading && (
        <div className='raw'>
          <BranchSelect
            className='select'
            defaultValue='Choose branch'
            mode={'readonly'}
            project={project}
            value={_state.from}
            onChange={branch => setState({ ..._state, from: branch })}
          />

          <Icon
            className='icon'
            icon='arrow-right'
          />

          <BranchSelect
            className='select'
            defaultValue='Choose branch'
            mode={'readonly'}
            project={project}
            value={_state.to}
            onChange={branch => setState({ ..._state, to: branch })}
          />
        </div>
      )}

      {_state.loading && (
        <div className='progress'>
          <ProgressBar intent='primary' />
          <div className='progress_status'>
            <span>{appStatus}</span>
          </div>
        </div>
      )}
    </div>

    <div className={Classes.DIALOG_FOOTER}>
      <div className={Classes.DIALOG_FOOTER_ACTIONS}>
        <Button onClick={closeModal}>Close</Button>
        <Button
          intent='primary'
          loading={_state.loading}
          onClick={() => createPullRequest({
            dispatch, from: _state.from, project, state, to: _state.to
          }, closeModal)}
        >
          Create Pull Request
        </Button>
      </div>
    </div>
  </Root>);
};