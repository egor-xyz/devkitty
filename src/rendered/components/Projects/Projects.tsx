import { useMemo } from 'react';
import { Button, NonIdealState } from '@blueprintjs/core';
import Devkitty from 'rendered/assets/devkitty.svg?react';

import { useGroups } from 'rendered/hooks/useGroups';
import { useProjects } from 'rendered/hooks/useProjects';
import { Group } from 'types/Group';
import { useNewGroups } from 'rendered/hooks/useNewGroups';

import { GroupCollapse } from '../GroupCollapse';
import { Project } from '../Project';
import { ProjectsWrapper, Root } from './Projects.styles';

const others: Group = { fullName: 'Ungrouped', icon: 'folder-open', id: 'ungrouped', name: 'Ungrouped' };

export const Projects = () => {
  const { selectedGroups, collapsedGroups, toggleCollapsed, selectAll } = useGroups();
  const { groups, groupIds } = useNewGroups();
  const { projects, addProject } = useProjects();

  const sortedProjects = useMemo(() => {
    return [...groups, others].map((group) => ({
      ...group,
      projects: projects.filter(
        ({ groupId }) => groupId === group.id || (group.id === 'ungrouped' && (!groupId || !groupIds.includes(groupId)))
      )
    }));
  }, [groups, projects]);

  const isEmpty = false;
  const withGroups = groups.length > 0 && projects.length > 0 && sortedProjects.length > 1;

  return (
    <Root>
      <ProjectsWrapper>
        {!projects.length && (
          <NonIdealState
            action={
              <Button
                icon="plus"
                intent="primary"
                text="Add one or few repositories"
                onClick={addProject}
              />
            }
            description="Add your first repository to get started."
            icon={<Devkitty height={100} />}
            title="Welcome to Devkitty!"
          />
        )}

        {isEmpty && (
          <NonIdealState
            action={
              <Button
                icon="reset"
                text="Select all groups"
                onClick={selectAll}
              />
            }
            description={
              <>
                No projects found in <b>{selectedGroups.slice().join(', ')}</b> group
                {selectedGroups.length > 1 ? 's' : ''}
              </>
            }
            icon="folder-close"
            title="No projects"
          />
        )}

        {!withGroups &&
          projects.map((project) => (
            <Project
              key={project.id}
              project={project}
            />
          ))}

        {withGroups &&
          sortedProjects.map((group, index) => (
            <GroupCollapse
              collapsed={Boolean(collapsedGroups.includes(group.id))}
              group={group}
              index={index}
              key={group.id}
              projects={group.projects}
              onClick={() => toggleCollapsed(group.id)}
            />
          ))}
      </ProjectsWrapper>
    </Root>
  );
};
