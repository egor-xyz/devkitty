import { useMemo } from 'react';

import { useGroups } from 'rendered/hooks/useGroups';
import { useProjects } from 'rendered/hooks/useProjects';
import { Group } from 'types';

import { GroupCollapse } from '../GroupCollapse';
import { Project } from '../Project';
import { GroupsSelector } from '../ProjectsActions';
import { Flag, ProjectsWrapper, Root } from './Projects.styles';

const others: Group = { fullName: 'Ungrouped', icon: 'folder-open', id: 'ungrouped', name: 'Ungrouped' };

export const Projects = () => {
  const { groupsWithAliases, selectedGroups, collapsedGroups, toggleCollapsed } = useGroups();
  const { projects } = useProjects();

  const sortedProjects = useMemo(() => {
    // project group id not in groups
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

  return (
    <Root>
      <GroupsSelector />

      <Flag />

      <ProjectsWrapper>
        {!selectedGroups.length &&
          projects.map((project) => (
            <Project
              key={project.id}
              project={project}
            />
          ))}

        {Boolean(selectedGroups.length) &&
          sortedProjects.map((group) => (
            <GroupCollapse
              collapsed={Boolean(collapsedGroups.includes(group.id))}
              group={group}
              key={group.id}
              projects={group.projects}
              onClick={() => toggleCollapsed(group.id)}
            />
          ))}
      </ProjectsWrapper>
    </Root>
  );
};
