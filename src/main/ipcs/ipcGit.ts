import { ipcMain, safeStorage } from 'electron';

import { simpleGit, CleanOptions, ResetMode } from 'simple-git';
import axios from 'axios';

import { GitStatus } from 'types/project';

import { settings } from '../settings';

const getGit = async (id: string) => {
  const projects = settings.get('projects');
  const project = projects.find((project) => project.id === id);

  if (!project) new Error('Project not found');

  const { filePath } = project;
  const git = simpleGit(filePath);

  if (!(await git.checkIsRepo())) new Error('Not a git repository');

  return git;
};

ipcMain.handle('git:getStatus', async (e, id: string): Promise<GitStatus> => {
  try {
    const git = await getGit(id);

    await git.fetch();

    // Get current branch status
    const status = await git.status();
    const isClean = status.isClean();
    delete status.isClean;
    const gitStatus = { ...status, isClean };

    // Get organization
    let organization: string;
    try {
      const origin = await git.remote(['get-url', 'origin']);
      organization = origin ? origin.split(':')[1].split('/')[0] : undefined;
    } catch (e) {
      /* empty */
    }

    const branchSummary = await git.branch();

    return { branchSummary, organization, status: gitStatus, success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:checkout', async (e, id: string, branch: string) => {
  try {
    const git = await getGit(id);

    await git.checkout(branch);

    return { message: 'Branch checked out', success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:pull', async (e, id: string) => {
  try {
    const git = await getGit(id);

    await git.pull();

    return { message: 'Project pulled', success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:reset', async (_, id: string, target, force) => {
  try {
    const git = await getGit(id);

    await git.reset(ResetMode.HARD, [`origin/${target}`]);

    await git.clean(CleanOptions.FORCE);

    force && (await git.push(['-f']));

    return { message: 'Project reset', success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});

ipcMain.handle('git:mergeTo', async (e, id: string, from: string, target: string) => {
  try {
    const git = await getGit(id);

    await git.checkout(target);
    await git.pull();
    await git.merge([from]);
    await git.push();
    await git.checkout(from);

    return { message: `${from} merged to ${target}`, success: true };
  } catch (e) {
    // files conflict found
    if (e.git?.merges?.length && e.git.result) {
      return { merges: e.git.merges, message: e.git.result, success: false };
    }

    return { message: e.message, success: false };
  }
});

const protectedBranches = ['master', 'main'];

ipcMain.handle('git:api:reset', async (_, id: string, origin: string, target: string) => {
  try {
    if (protectedBranches.includes(origin)) throw new Error(`Branch ${origin} is forbidden to reset`);

    const { gitHubToken } = settings.get('appSettings');
    if (!gitHubToken) throw new Error('GitHub token not found');

    const token = safeStorage.decryptString(Buffer.from(gitHubToken));
    if (!token) throw new Error('GitHub token not found');

    const git = await getGit(id);

    const headers = {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    };

    const repo = await git.remote(['get-url', 'origin']);
    if (!repo) throw new Error('Repo not found');
    const [repository] = repo.split(':')[1].split('.git');

    const targetData = await axios.get(`https://api.github.com/repos/${repository}/git/refs/heads/${target}`, {
      headers
    });

    const sha: string | undefined = targetData.data?.object?.sha;
    if (!sha) throw new Error('Target branch not found');

    await axios.patch(
      `https://api.github.com/repos/${repository}/git/refs/heads/${origin}`,
      { force: true, sha },
      { headers }
    );

    return { message: `Branch ${origin} was reset to ${target}`, success: true };
  } catch (e) {
    return { message: e.message, success: false };
  }
});
