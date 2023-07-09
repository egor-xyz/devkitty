import { spawn, ChildProcess } from 'child_process';

import log from 'electron-log';
import appPath from 'app-path';

import { FoundShell } from 'types/foundShell';

import { assertNever } from '../fatal-error';
import { parseEnumValue } from '../enum';

export enum Shell {
  Alacritty = 'Alacritty',
  Hyper = 'Hyper',
  Kitty = 'Kitty',
  PowerShellCore = 'PowerShell Core',
  Tabby = 'Tabby',
  Terminal = 'Terminal',
  Warp = 'Warp',
  WezTerm = 'WezTerm',
  iTerm2 = 'iTerm2'
}

export const Default = Shell.Terminal;

export function parse(label: string): Shell {
  return parseEnumValue(Shell, label) ?? Default;
}

function getBundleID(shell: Shell): string {
  switch (shell) {
    case Shell.Terminal:
      return 'com.apple.Terminal';
    case Shell.iTerm2:
      return 'com.googlecode.iterm2';
    case Shell.Hyper:
      return 'co.zeit.hyper';
    case Shell.PowerShellCore:
      return 'com.microsoft.powershell';
    case Shell.Kitty:
      return 'net.kovidgoyal.kitty';
    case Shell.Alacritty:
      return 'io.alacritty';
    case Shell.Tabby:
      return 'org.tabby';
    case Shell.WezTerm:
      return 'com.github.wez.wezterm';
    case Shell.Warp:
      return 'dev.warp.Warp-Stable';
    default:
      return assertNever(shell, `Unknown shell: ${shell}`);
  }
}

async function getShellPath(shell: Shell): Promise<string | null> {
  const bundleId = getBundleID(shell);
  try {
    return await appPath(bundleId);
  } catch (e) {
    // `appPath` will raise an error if it cannot find the program.
    log.info(`Unable to locate shell: ${shell} installation`);
    return null;
  }
}

export async function getAvailableShells(): Promise<ReadonlyArray<FoundShell<Shell>>> {
  const [
    terminalPath,
    hyperPath,
    iTermPath,
    powerShellCorePath,
    kittyPath,
    alacrittyPath,
    tabbyPath,
    wezTermPath,
    warpPath
  ] = await Promise.all([
    getShellPath(Shell.Terminal),
    getShellPath(Shell.Hyper),
    getShellPath(Shell.iTerm2),
    getShellPath(Shell.PowerShellCore),
    getShellPath(Shell.Kitty),
    getShellPath(Shell.Alacritty),
    getShellPath(Shell.Tabby),
    getShellPath(Shell.WezTerm),
    getShellPath(Shell.Warp)
  ]);

  const shells: Array<FoundShell<Shell>> = [];
  if (terminalPath) {
    shells.push({ path: terminalPath, shell: Shell.Terminal });
  }

  if (hyperPath) {
    shells.push({ path: hyperPath, shell: Shell.Hyper });
  }

  if (iTermPath) {
    shells.push({ path: iTermPath, shell: Shell.iTerm2 });
  }

  if (powerShellCorePath) {
    shells.push({ path: powerShellCorePath, shell: Shell.PowerShellCore });
  }

  if (kittyPath) {
    const kittyExecutable = `${kittyPath}/Contents/MacOS/kitty`;
    shells.push({ path: kittyExecutable, shell: Shell.Kitty });
  }

  if (alacrittyPath) {
    const alacrittyExecutable = `${alacrittyPath}/Contents/MacOS/alacritty`;
    shells.push({ path: alacrittyExecutable, shell: Shell.Alacritty });
  }

  if (tabbyPath) {
    const tabbyExecutable = `${tabbyPath}/Contents/MacOS/Tabby`;
    shells.push({ path: tabbyExecutable, shell: Shell.Tabby });
  }

  if (wezTermPath) {
    const wezTermExecutable = `${wezTermPath}/Contents/MacOS/wezterm`;
    shells.push({ path: wezTermExecutable, shell: Shell.WezTerm });
  }

  if (warpPath) {
    const warpExecutable = `${warpPath}/Contents/MacOS/stable`;
    shells.push({ path: warpExecutable, shell: Shell.Warp });
  }

  return shells;
}

export function launchExternalShell(foundShell: FoundShell<Shell>, path: string): ChildProcess {
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
  } else {
    const bundleID = getBundleID(foundShell.shell);
    return spawn('open', ['-b', bundleID, path]);
  }
}
