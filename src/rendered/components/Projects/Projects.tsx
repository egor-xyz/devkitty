import { useCallback, useMemo } from 'react';
import { Button, NonIdealState } from '@blueprintjs/core';
import Devkitty from 'rendered/assets/devkitty.svg?react';

import { useGroups } from 'rendered/hooks/useGroups';
import { useProjects } from 'rendered/hooks/useProjects';
import { Group } from 'types/Group';
import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { useNewGroups } from 'rendered/hooks/useNewGroups';

import { GroupCollapse } from '../GroupCollapse';
import { Project } from '../Project';
import { GroupsSelector } from '../ProjectsActions';
import { ProjectsWrapper, Root } from './Projects.styles';

const others: Group = { fullName: 'Ungrouped', icon: 'folder-open', id: 'ungrouped', name: 'Ungrouped' };

export const Projects = () => {
  const { oldFashionGroups } = useAppSettings();
  const { groupsWithAliases, selectedGroups, collapsedGroups, toggleCollapsed, selectAll } = useGroups();
  const { groups } = useNewGroups();
  const { projects, addProject } = useProjects();

  const sortOldFashionGroups = useCallback(() => {
    let sortedProjects = [...groupsWithAliases, others].map((group) => ({
      ...group,
      projects: projects.filter(
        (project) =>
          project.group === group.id ||
          (group.id === 'ungrouped' && !project.group) ||
          (group.id === 'ungrouped' && project.group && !groupsWithAliases.find(({ id }) => id === project.group))
      )
    }));

    // all groups selected
    if (groupsWithAliases.length === selectedGroups.length) {
      return sortedProjects.filter((group) => group.projects.length);
    }

    sortedProjects = selectedGroups.length
      ? sortedProjects.filter((group) => selectedGroups.includes(group.id) && group.projects.length)
      : sortedProjects.filter((group) => group.projects.length);

    return sortedProjects;
  }, [groupsWithAliases, projects, selectedGroups]);

  const sortedProjects = useMemo(() => {
    if (oldFashionGroups) {
      return sortOldFashionGroups();
    }

    return [...groups, others]
      .map((group) => ({
        ...group,
        projects: projects.filter(
          ({ groupId }) =>
            groupId === group.id ||
            (group.id === 'ungrouped' && !groupId) ||
            (group.id === 'ungrouped' && groupId && !groupsWithAliases.find(({ id }) => id === groupId))
        )
      }))
      .filter((group) => group.projects.length);
  }, [sortOldFashionGroups]);

  const isEmpty = oldFashionGroups
    ? Boolean(selectedGroups.length) && !sortedProjects.length && projects.length > 0
    : false;

  const withGroups = oldFashionGroups
    ? Boolean(selectedGroups.length)
    : groups.length > 0 && projects.length > 0 && sortedProjects.length > 1;

  console.log(sortedProjects);

  return (
    <Root>
      {oldFashionGroups && <GroupsSelector />}

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
          sortedProjects.map(
            (group) =>
              group.projects.length > 0 && (
                <GroupCollapse
                  collapsed={Boolean(collapsedGroups.includes(group.id))}
                  group={group}
                  key={group.id}
                  projects={group.projects}
                  onClick={() => toggleCollapsed(group.id)}
                />
              )
          )}
      </ProjectsWrapper>
    </Root>
  );
};
