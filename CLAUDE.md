# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Devkitty is a macOS Electron desktop application for managing GitHub repositories. It allows users to monitor GitHub actions, manage branches, and integrate with code editors and terminals.

## Commands

This project uses **pnpm** as the package manager.

```bash
# Development
pnpm dev              # Start dev server with hot reload

# Build
pnpm build           # Build for production (electron-vite)
pnpm make            # Build universal macOS app (x64 + arm64)
pnpm make:arm        # Build for arm64 only

# Linting
pnpm lint            # ESLint with auto-fix

# Publishing
pnpm publish         # Publish to GitHub releases
```

## Architecture

### Hot Reload

Only renderer (`src/renderer/`) changes are hot-reloaded. Changes to main process (`src/main/`) or preload (`src/preload/`) require restarting `pnpm dev`. Always restart the dev server automatically when these files are modified.

### Process Separation

The app follows Electron's process model:

- **Main process** (`src/main/`): Node.js context with full OS access. Handles git operations, file system, window management, and persistent storage via `electron-store`.
- **Renderer process** (`src/renderer/`): React UI running in Chromium. Uses Zustand for state management.
- **Preload script** (`src/preload/`): Exposes a typed `window.bridge` API for secure IPC communication.

### IPC Communication

All main/renderer communication goes through the bridge pattern:

```
Renderer Component → window.bridge.* → ipcRenderer.invoke → Main Process Handler → electron-store
```

IPC handlers are organized by domain in `src/main/ipcs/`:
- `ipcGit.ts` - Git operations (checkout, pull, merge, reset)
- `ipcGitHub.ts` - GitHub API via Octokit
- `ipcProjects.ts` - Project CRUD
- `ipcSettings.ts` - App configuration
- `ipcLaunch.ts` - Open editors/terminals
- `ipcDarkMode.ts` - Theme management

### State Management

Zustand stores in `src/renderer/hooks/` are initialized asynchronously at startup from `electron-store` data:

- `useProjects` - Loaded repositories
- `useAppSettings` - Editor, shell, fetch intervals
- `useDarkMode` - Theme state (syncs with OS)
- `useModal` - Modal/dialog management
- `useGroups` - Project grouping

### Key Libraries

- **simple-git**: All git operations
- **Octokit**: GitHub API client
- **Blueprint.js + Tailwind CSS**: UI components and styling
- **react-dnd**: Drag-and-drop for project reordering

### Build Configuration

- `electron.vite.config.ts` - electron-vite config for main, preload, and renderer
- `electron-builder.yml` - electron-builder config with code signing, notarization, and GitHub publisher
