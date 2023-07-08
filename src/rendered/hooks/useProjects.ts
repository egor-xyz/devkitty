import { create } from 'zustand';

import { appToaster } from 'rendered/utils/appToaster';
import { Projects } from 'types/project';

type State = {
  projects: Projects;
};

type Actions = {
  addGroup: (projectId: string, groupId: string) => void;
  addProject: () => void;
  removeProject: (id: string) => void;
};

export const useProjects = create<State & Actions>((set, get) => ({
  addGroup: async (projectId: string, groupId: string) => {
    const project = get().projects.find((project) => project.id === projectId);
    if (!project) return;

    project.group = groupId;

    await window.bridge.projects.update(project);
    const projects = await window.bridge.settings.get('projects');
    set({ projects });
  },
  addProject: async () => {
    const res = await window.bridge.projects.add();
    if (!res.success && !res.canceled) {
      appToaster.show({ icon: 'error', intent: 'danger', message: res.message ?? 'Something went wrong' });
      return;
    }
    const projects = await window.bridge.settings.get('projects');
    set({ projects });
  },
  projects: [],
  removeProject: async (id: string) => {
    await window.bridge.projects.remove(id);
    const projects = await window.bridge.settings.get('projects');
    set({ projects });
  }
}));

(async () => {
  const projects = await window.bridge.settings.get('projects');
  useProjects.setState({ projects });
})();
