import { appToaster } from 'rendered/utils/appToaster';
import { type Projects } from 'types/project';
import { create } from 'zustand';

type Actions = {
  addGroupId: (id: string, groupId?: string) => void;
  addProject: () => void;
  removeProject: (id: string) => void;
};

type State = {
  projects: Projects;
};

export const useProjects = create<Actions & State>((set, get) => ({
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
