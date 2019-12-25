import { Dispatch, FC, useState } from 'react';
import clsx from 'clsx';

import { Project } from 'models';
import { AppStoreActions, AppStoreState, useAppStore, useAppStoreDispatch } from 'context';
import { BranchSelect } from 'components/BranchSelect';
import { onContextMenu, ProjectCardActions, ProjectCardInfo } from 'components';
import { useModalsStore } from 'modals/context';

import { ExtraBranchInfo, ProjectCardStatus, QuickActions } from './components';
import { StyledCard } from './ProjectCard.styles';

interface Props {
  checkoutBranch: (project: Project, branch: string) => void;
  fetchFolder: (project: Project, dispatch: Dispatch<AppStoreActions>) => void;
  project: Project;
  pullFolder: (project: Project, dispatch: Dispatch<AppStoreActions>, state: AppStoreState) => void;
}

export const ProjectCard: FC<Props> = ({ checkoutBranch, project, fetchFolder, pullFolder }) => {
  const state = useAppStore();
  const dispatch = useAppStoreDispatch();

  const { openModal } = useModalsStore();
  const [showInfo, setShowInfo] = useState(false);
  const { projectInfo, loading } = state;
  const { branch } = project;

  return (<>
    <StyledCard
      elevation={1}
      onContextMenu={e => onContextMenu(e, project, state, dispatch, openModal)}
    >
      <div className='block'>
        <ProjectCardStatus
          loading={loading[project.repo]}
          project={project}
          setShowInfo={setShowInfo}
        />

        <ExtraBranchInfo
          isOpen={projectInfo}
          loading={loading[project.repo]}
          project={project}
        />
      </div>

      <div className='block block_select'>
        {branch.all.length < 2 && (
          <span className={clsx('block_text', { 'bp3-skeleton': loading[project.repo] })}>
            {branch.current
              ? branch.current
              : 'empty repo - no commits yet'
            }
          </span>
        )}

        {branch.all.length > 1 && (
          <BranchSelect
            className='block_button'
            project={project}
            value={branch.current}
            onChange={branch => checkoutBranch(project, branch)}
          />
        )}

        <QuickActions
          loading={loading[project.repo]}
          project={project}
        />
      </div>

      <div className='block'>
        <ProjectCardActions
          fetchFolder={fetchFolder}
          project={project}
          pullFolder={pullFolder}
        />
      </div>
    </StyledCard>

    <ProjectCardInfo
      isOpen={showInfo}
      project={project}
      onClose={() => setShowInfo(false)}
    />
  </>);
};