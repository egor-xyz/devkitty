import { simpleGit } from 'simple-git';
import { type Worktree } from 'types/worktree';

import { settings } from '../settings';

export const getGit = async (id: string) => {
  // @ts-ignore tmp
  const projects = settings.get('projects');
  // @ts-ignore tmp
  const project = projects.find((project) => project.id === id);

  if (!project) new Error('Project not found');

  const { filePath } = project;
  const git = simpleGit(filePath);

  if (!(await git.checkIsRepo())) new Error('Not a git repository');

  return git;
};

export const parseWorktreeList = (output: string): Worktree[] => {
  const worktrees: Worktree[] = [];
  const blocks = output.trim().split('\n\n');

  for (const block of blocks) {
    if (!block.trim()) continue;

    const lines = block.trim().split('\n');
    let path = '';
    let branch = '';
    let isBare = false;

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        path = line.slice('worktree '.length);
      } else if (line.startsWith('branch ')) {
        branch = line.slice('branch '.length).replace('refs/heads/', '');
      } else if (line === 'bare') {
        isBare = true;
      } else if (line === 'detached') {
        branch = '(detached)';
      }
    }

    if (path && !isBare) {
      worktrees.push({
        branch,
        isMain: worktrees.length === 0,
        path
      });
    }
  }

  return worktrees;
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
  } catch {
    return {};
  }
};
