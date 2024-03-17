import { create } from 'zustand';

import { appToaster } from 'rendered/utils/appToaster';
import { Projects } from 'types/project';

type State = {
  projects: Projects;
};

type Actions = {
  addGroupId: (id: string, groupId?: string) => void;
  addProject: () => void;
  removeProject: (id: string) => void;
};

export const useProjects = create<State & Actions>((set, get) => ({
  addGroupId: async (id, groupId) => {
    const project = get().projects.find((project) => project.id === id);
    if (!project) return;

    project.groupId = groupId;

    await window.bridge.projects.update(project);
    const projects = await window.bridge.settings.get('projects');
    set({ projects });
  },
  addProject: async () => {
    const res = await window.bridge.projects.add();
    if (!res.success && !res.canceled) {
      (await appToaster).show({ icon: 'error', intent: 'danger', message: res.message ?? 'Something went wrong' });
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
