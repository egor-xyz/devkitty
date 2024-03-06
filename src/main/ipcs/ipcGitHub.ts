import { ipcMain, safeStorage } from 'electron';

import { Octokit } from 'octokit';

import { getRepoInfo } from '../libs/git';
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

    const { owner, repo } = await getRepoInfo(id);
    if (!owner || !repo) throw new Error('Project not found');

    const targetData = await getClient().rest.git.getRef({
      owner,
      ref: `heads/${target}`,
      repo
    });

    const sha = targetData.data?.object?.sha;
    if (!sha) throw new Error('Target branch not found');

    getClient().rest.git.updateRef({
      force: true,
      owner,
      ref: `heads/${origin}`,
      repo,
      sha
    });

    return { message: `Branch ${origin} was reset to ${target}`, success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});
