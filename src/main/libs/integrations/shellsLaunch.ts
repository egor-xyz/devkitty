import { type ChildProcess, spawn } from 'child_process';

import { type FoundShell as IFoundShell } from '../../../types/foundShell';
import { assertNever } from './fatal-error';

export enum Shell {
  Alacritty = 'Alacritty',
  Ghostty = 'Ghostty',
  Hyper = 'Hyper',
  iTerm2 = 'iTerm2',
  Kitty = 'Kitty',
  PowerShellCore = 'PowerShell Core',
  Tabby = 'Tabby',
  Terminal = 'Terminal',
  Warp = 'Warp',
  WezTerm = 'WezTerm'
}

export function launch(foundShell: IFoundShell<Shell>, path: string): ChildProcess {
  if (foundShell.shell === Shell.Kitty) {
    // kitty does not handle arguments as expected when using `open` with
    // an existing session but closed window (it reverts to the previous
    // directory rather than using the new directory directory).
    //
    // This workaround launches the internal `kitty` executable which
    // will open a new window to the desired path.
    return spawn(foundShell.path, ['--single-instance', '--directory', path]);
  } else if (foundShell.shell === Shell.Alacritty) {
    // Alacritty cannot open files in the folder format.
    //
    // It uses --working-directory command to start the shell
    // in the specified working directory.
    return spawn(foundShell.path, ['--working-directory', path]);
  } else if (foundShell.shell === Shell.Tabby) {
    // Tabby cannot open files in the folder format.
    //
    // It uses open command to start the shell
    // in the specified working directory.
    return spawn(foundShell.path, ['open', path]);
  } else if (foundShell.shell === Shell.WezTerm) {
    // WezTerm, like Alacritty, "cannot open files in the 'folder' format."
    //
    // It uses the subcommand `start`, followed by the option `--cwd` to set
    // the working directory, followed by the path.
    return spawn(foundShell.path, ['start', '--cwd', path]);
  } else if (foundShell.shell === Shell.Ghostty) {
    // Use 'open -a' to launch Ghostty.app with working directory
    return spawn('open', ['-b', 'com.mitchellh.ghostty', path]);
  } else {
    const bundleID = getBundleID(foundShell.shell);
    return spawn('open', ['-b', bundleID, path]);
  }
}

function getBundleID(shell: Shell): string {
  switch (shell) {
    case Shell.Alacritty:
      return 'io.alacritty';
    case Shell.Ghostty:
      return 'com.mitchellh.ghostty';
    case Shell.Hyper:
      return 'co.zeit.hyper';
    case Shell.iTerm2:
      return 'com.googlecode.iterm2';
    case Shell.Kitty:
      return 'net.kovidgoyal.kitty';
    case Shell.PowerShellCore:
      return 'com.microsoft.powershell';
    case Shell.Tabby:
      return 'org.tabby';
    case Shell.Terminal:
      return 'com.apple.Terminal';
    case Shell.Warp:
      return 'dev.warp.Warp-Stable';
    case Shell.WezTerm:
      return 'com.github.wez.wezterm';
    default:
      return assertNever(shell, `Unknown shell: ${shell}`);
  }
}
