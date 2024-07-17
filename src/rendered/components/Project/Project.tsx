/* eslint-disable react/jsx-max-depth */
import { Button, ButtonGroup, Classes, Colors, Popover } from '@blueprintjs/core';
import { FC, useState } from 'react';

import { useGit } from 'rendered/hooks/useGit';
import { useModal } from 'rendered/hooks/useModal';
import { useMountEffect } from 'rendered/hooks/useMountEffect';
import { Project as IProject } from 'types/project';

import { GitStatusGroup } from '../GitStatusGroup';
import { Info, InfoText, MiddleBlock, ProjectActions, RepoInfo, Root, StyledSpinner, Title } from './Project.styles';
import { CheckoutBranch } from './components/CheckoutBranch';
import { Error } from './components/Error';
import { ProjectMenu } from './components/ProjectMenu';
import { QuickActions } from './components/QuickActions';
import { useActions } from './hooks/useActions';
import { usePulls } from './hooks/usePulls';

type Props = {
  project: IProject;
};

export const Project: FC<Props> = ({ project }) => {
  const { gitStatus, getStatus, loading, pull } = useGit();
  const { openModal } = useModal();
  const [pullLoading, setPullLoading] = useState(false);

  const { Actions, showActions, toggleActions, getActions } = useActions(gitStatus, project);
  const { Pulls, showPulls, togglePulls, refreshPulls } = usePulls(project);

  const { id, name, groupId } = project;

  const updateProject = () => {
    showActions && getActions();
    showPulls && refreshPulls();
    getStatus(id);
  };

  const runPull = async () => {
    setPullLoading(true);
    await pull(id, name);
    setPullLoading(false);
  };

  const removeAlert = () => {
    openModal({
      name: 'remove:project',
      props: { id, name }
    });
  };

  useMountEffect(() => {
    getStatus(id, true);
  });

  const behind = gitStatus?.status?.behind ?? 0;

  if (gitStatus && !gitStatus.success) {
    return (
      <Error
        name={name}
        removeAlert={removeAlert}
      />
    );
  }

  return (
    <>
      <Root>
        <Info>
          <InfoText className={loading && !gitStatus && Classes.SKELETON}>
            <Title>{name}</Title>
            <RepoInfo>{gitStatus?.organization ?? 'Local git'}</RepoInfo>
          </InfoText>

          <GitStatusGroup
            gitStatus={gitStatus}
            name={name}
          />
        </Info>

        <MiddleBlock>
          <CheckoutBranch
            getStatus={updateProject}
            gitStatus={gitStatus}
            id={id}
            name={name}
          />

          <QuickActions
            gitStatus={gitStatus}
            project={project}
            showActions={showActions}
            showPulls={showPulls}
            toggleActions={toggleActions}
            togglePulls={togglePulls}
          />
        </MiddleBlock>

        <ProjectActions className={!gitStatus && Classes.SKELETON}>
          <ButtonGroup large>
            {!behind && (
              <Button
                icon="refresh"
                onClick={updateProject}
              />
            )}
            {Boolean(behind) && (
              <Button
                icon="arrow-down"
                intent="warning"
                loading={pullLoading}
                onClick={runPull}
              />
            )}
            <Popover
              content={
                <ProjectMenu
                  getStatus={updateProject}
                  gitStatus={gitStatus}
                  groupId={groupId}
                  id={id}
                  name={name}
                  pull={runPull}
                  removeProject={removeAlert}
                />
              }
              placement="bottom-end"
            >
              <Button
                icon="caret-down"
                intent={behind ? 'warning' : 'none'}
              />
            </Popover>
          </ButtonGroup>

          <StyledSpinner
            color={Colors.ORANGE1}
            icon="dot"
            loading={loading}
          />
        </ProjectActions>
      </Root>

      {Actions}
      {Pulls}
    </>
  );
};
