import { Button, NonIdealState } from '@blueprintjs/core';
import { useMemo } from 'react';
import Devkitty from 'rendered/assets/devkitty.svg?react';
import { useGroups } from 'rendered/hooks/useGroups';
import { useProjects } from 'rendered/hooks/useProjects';
import { type Group } from 'types/Group';

import { GroupCollapse } from '../GroupCollapse';
import { Project } from '../Project';

const others: Group = { fullName: 'Ungrouped', icon: 'folder-open', id: 'ungrouped', name: 'Ungrouped' };

export const Projects = () => {
  const { collapsedGroups, groupIds, groups, toggleCollapsed } = useGroups();
  const { addProject, projects } = useProjects();

  const sortedProjects = useMemo(() => [...groups, others].map((group) => ({
      ...group,
      projects: projects.filter(
        ({ groupId }) => groupId === group.id || (group.id === 'ungrouped' && (!groupId || !groupIds.includes(groupId)))
      )
    })), [groupIds, groups, projects]);

  const withGroups = groups.length > 0 && projects.length > 0 && sortedProjects.length > 1;

  return (
    <div className="flex relative flex-col h-[calc(100vh-50px)] bg-blueprint-light-gray2 dark:bg-transparent">
      <div className="flex flex-col content-end h-full pb-1 overflow-y-auto scrollbar-none scroll-smooth">
        {!projects.length && (
          <NonIdealState
            action={
              <Button
                icon="plus"
                intent="primary"
                onClick={addProject}
                text="Add one or few repositories"
              />
            }
            description="Add your first repository to get started."
            icon={<Devkitty height={100} />}
            title="Welcome to Devkitty!"
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
              onClick={() => toggleCollapsed(group.id)}
              projects={group.projects}
            />
          ))}
      </div>
    </div>
  );
};
