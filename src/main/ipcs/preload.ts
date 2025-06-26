import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { type AppSettings } from 'types/appSettings';
import { type FoundEditor } from 'types/foundEditor';
import { type FoundShell } from 'types/foundShell';
import { type pullTypes } from 'types/gitHub';
import { type ThemeSource } from 'types/Modal';
import { type GitStatus, type Project } from 'types/project';
import { type Settings } from 'types/settings';

const bridge = {
  darkMode: {
    on: (callback: (event: IpcRendererEvent, theme: ThemeSource) => void) => ipcRenderer.on('theme-changed', callback),
    set: (theme: ThemeSource) => ipcRenderer.invoke('dark-mode:set', theme),
    toggle: () => ipcRenderer.invoke('dark-mode:toggle')
  },
  git: {
    checkout: (id: string, branch: string) => ipcRenderer.invoke('git:checkout', id, branch),
    getStatus: (id: string): Promise<GitStatus> => ipcRenderer.invoke('git:getStatus', id),
    mergeTo: (id: string, from: string, to: string) => ipcRenderer.invoke('git:mergeTo', id, from, to),
    pull: (id: string) => ipcRenderer.invoke('git:pull', id),
    reset: (id: string, target: string, force: boolean) => ipcRenderer.invoke('git:reset', id, target, force)
  },
  gitAPI: {
    getAction: (id: string, filterBy: string[]) => ipcRenderer.invoke('git:api:getAction', id, filterBy),
    getPulls: (id: string, type: (typeof pullTypes)[number]) => ipcRenderer.invoke('git:api:getPulls', id, type),
    reset: (id: string, origin: string, target: string) => ipcRenderer.invoke('git:api:reset', id, origin, target)
  },
  launch: {
    editor: (fullPath: string, editor: FoundEditor) => ipcRenderer.invoke('launch:editor', { editor, fullPath }),
    shell: (fullPath: string, shell: FoundShell<string>) => ipcRenderer.invoke('launch:shell', { fullPath, shell })
  },
  projects: {
    add: () => ipcRenderer.invoke('projects:add'),
    get: () => ipcRenderer.invoke('projects:get'),
    remove: (id: string) => ipcRenderer.invoke('projects:remove', id),
    update: (project: Project) => ipcRenderer.invoke('projects:update', project)
  },
  settings: {
    get: (key: keyof Settings) => ipcRenderer.invoke('settings:get', key),
    onAppSettings: (callback: (event: IpcRendererEvent, value: AppSettings) => void) =>
      ipcRenderer.on('settings:updated', callback),
    set: <K extends keyof Settings>(key: K, value: Partial<Settings[K]>, safe?: boolean) =>
      ipcRenderer.invoke('settings:set', key, value, safe)
  },
  sticker: {
    add: (text: string) => ipcRenderer.invoke('sticker:add', text)
  }
};

contextBridge.exposeInMainWorld('bridge', bridge);

export type Bridge = typeof bridge;
