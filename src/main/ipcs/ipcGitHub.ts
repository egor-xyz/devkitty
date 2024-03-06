import { ipcMain, safeStorage } from 'electron';

import { Octokit } from 'octokit';

import { getGit } from '../libs/git';
import { settings } from '../settings';

const protectedBranches = ['master', 'main'];

const getClient = () => {
  const { gitHubToken } = settings.get('appSettings');
  if (!gitHubToken) throw new Error('GitHub token not found');

  const token = safeStorage.decryptString(Buffer.from(gitHubToken));
  if (!token) throw new Error('GitHub token not found');

  return new Octokit({ auth: token });
};

ipcMain.handle('git:api:reset', async (_, id: string, origin: string, target: string) => {
  try {
    if (protectedBranches.includes(origin)) throw new Error(`Branch ${origin} is forbidden to reset`);

    const { gitHubToken } = settings.get('appSettings');
    if (!gitHubToken) throw new Error('GitHub token not found');

    const token = safeStorage.decryptString(Buffer.from(gitHubToken));
    if (!token) throw new Error('GitHub token not found');

    const git = await getGit(id);

    const repo = await git.remote(['get-url', 'origin']);
    if (!repo) throw new Error('Repo not found');
    const [repository] = repo.split(':')[1].split('.git');

    const targetData = await getClient().rest.git.getRef({
      owner: repository.split('/')[0],
      ref: `heads/${target}`,
      repo: repository.split('/')[1]
    });

    const sha = targetData.data?.object?.sha;
    if (!sha) throw new Error('Target branch not found');

    getClient().rest.git.updateRef({
      force: true,
      owner: repository.split('/')[0],
      ref: `heads/${origin}`,
      repo: repository.split('/')[1],
      sha
    });

    return { message: `Branch ${origin} was reset to ${target}`, success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});
