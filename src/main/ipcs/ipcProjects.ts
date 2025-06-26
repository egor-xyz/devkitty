import { dialog, ipcMain } from 'electron';
import { type Projects } from 'types/project';
import { v5 } from 'uuid';

import { settings } from '../settings';

ipcMain.handle('projects:get', () => settings.get('projects'));

ipcMain.handle('projects:add', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'multiSelections'] });

  if (res.canceled) {
    return { canceled: true, success: false };
  }

  const projects = await settings.get('projects');

  const newProjects: Projects = [];
  for (const filePath of res.filePaths) {
    if (projects.find((project) => project.filePath === filePath)) {
      continue;
    }

    const name = filePath.split('/').pop();
    const id = v5(filePath, v5.URL);
    newProjects.push({ filePath, id, name });
  }

  const allProjects = [...projects, ...newProjects];
  allProjects.sort((a, b) => a.name.localeCompare(b.name));

  await settings.set('projects', allProjects);

  return { success: true };
});

ipcMain.handle('projects:update', async (e, updatedProject) => {
  const projects = await settings.get('projects');

  const newProjects = projects.map((project) => {
    if (project.id === updatedProject.id) {
      return updatedProject;
    }
    return project;
  });

  await settings.set('projects', newProjects);

  return { success: true };
});

ipcMain.handle('projects:remove', async (e, id: string) => {
  const projects = await settings.get('projects');

  const newProjects = projects.filter((project) => project.id !== id);

  await settings.set('projects', newProjects);

  return { success: true };
});
