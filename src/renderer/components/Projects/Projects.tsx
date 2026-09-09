import { Button, NonIdealState } from '@blueprintjs/core';
import { useEffect, useMemo } from 'react';
import Devkitty from 'renderer/assets/devkitty.svg?react';
import { useFocus } from 'renderer/hooks/useFocus';
import { useGroups } from 'renderer/hooks/useGroups';
import { useProjects } from 'renderer/hooks/useProjects';
import { type Group } from 'types/Group';

import { GroupCollapse } from '../GroupCollapse';
import { Project } from '../Project';

const others: Group = { fullName: 'Ungrouped', icon: 'folder-open', id: 'ungrouped', name: 'Ungrouped' };

export const Projects = () => {
  const { collapsedGroups, groupIds, groups, toggleCollapsed } = useGroups();
  const { addProject, projects } = useProjects();
  const { clearFocus, focusedProjectId } = useFocus();

  const focusedProject = focusedProjectId ? projects.find(({ id }) => id === focusedProjectId) : undefined;

  // Escape drops focus mode — but only when nothing else (e.g. the ⌘F filter) has focus.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;

      if (event.key === 'Escape' && tag !== 'INPUT' && tag !== 'TEXTAREA' && focusedProjectId) {
        clearFocus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clearFocus, focusedProjectId]);

  // The focused repo may have been removed since focus was set — fall back to the full list.
  useEffect(() => {
    if (focusedProjectId && !focusedProject) clearFocus();
  }, [clearFocus, focusedProject, focusedProjectId]);

  const visibleProjects = focusedProjectId ? projects.filter(({ id }) => id === focusedProjectId) : projects;

  const sortedProjects = useMemo(() => [...groups, others].map((group) => ({
      ...group,
      projects: visibleProjects.filter(
        ({ groupId }) => groupId === group.id || (group.id === 'ungrouped' && (!groupId || !groupIds.includes(groupId)))
      )
    })), [groupIds, groups, visibleProjects]);

  const withGroups = !focusedProjectId && groups.length > 0 && projects.length > 0 && sortedProjects.length > 1;

  return (
    <div className="flex relative flex-col h-[calc(100vh-50px-var(--claude-footer-h))]">
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
          visibleProjects.map((project) => (
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
