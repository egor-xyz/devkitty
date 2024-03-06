import { simpleGit } from 'simple-git';

import { settings } from '../settings';

export const getGit = async (id: string) => {
  const projects = settings.get('projects');
  const project = projects.find((project) => project.id === id);

  if (!project) new Error('Project not found');

  const { filePath } = project;
  const git = simpleGit(filePath);

  if (!(await git.checkIsRepo())) new Error('Not a git repository');

  return git;
};
