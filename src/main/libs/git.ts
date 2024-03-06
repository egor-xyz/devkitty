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

export const getRepoInfo = async (id: string) => {
  try {
    const git = await getGit(id);

    const repo = await git.remote(['get-url', 'origin']);
    if (!repo) throw new Error('Repo not found');
    const [repository] = repo.split(':')[1].split('.git');

    return {
      owner: repository.split('/')[0],
      repo: repository.split('/')[1]
    };
  } catch (_) {
    return {};
  }
};
