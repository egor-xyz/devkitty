import { execSync } from 'child_process';

/**
 * Fix process.env.PATH on macOS when the app is launched from Finder.
 * Electron apps launched via Finder inherit a minimal PATH (/usr/bin:/bin:/usr/sbin:/sbin)
 * which doesn't include paths like /usr/local/bin or /opt/homebrew/bin where
 * tools like git-lfs are installed.
 */
export const fixPath = () => {
  if (process.platform !== 'darwin') return;

  try {
    const shell = process.env.SHELL || '/bin/zsh';
    const shellPath = execSync(`${shell} -ilc 'echo -n $PATH'`, {
      encoding: 'utf8',
      timeout: 5000
    });

    if (shellPath) {
      process.env.PATH = shellPath;
    }
  } catch {
    // Fallback: ensure common macOS paths are included
    const extraPaths = ['/usr/local/bin', '/opt/homebrew/bin', '/opt/homebrew/sbin'];
    const currentPath = process.env.PATH || '';
    const parts = currentPath.split(':');

    for (const p of extraPaths) {
      if (!parts.includes(p)) {
        parts.push(p);
      }
    }

    process.env.PATH = parts.join(':');
  }
};
