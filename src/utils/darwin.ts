import { ipcRenderer } from 'electron';
import { pathExists } from 'fs-extra';

export interface IFoundEditor<T> {
  readonly editor: T
  readonly path: string
  readonly usesShell?: boolean
}

/** Represents an external editor on macOS */
interface IDarwinExternalEditor {
  /**
   * List of bundle identifiers that are used by the app in its multiple
   * versions.
   **/
  readonly bundleIdentifiers: string[],

  /** Name of the editor. It will be used both as identifier and user-facing. */
  readonly name: string
}

/**
 * This list contains all the external editors supported on macOS. Add a new
 * entry here to add support for your favorite editor.
 **/
const editors: IDarwinExternalEditor[] = [
  {
    bundleIdentifiers: ['com.github.atom'],
    name: 'Atom',
  },
  {
    bundleIdentifiers: ['org.vim.MacVim'],
    name: 'MacVim',
  },
  {
    bundleIdentifiers: ['com.microsoft.VSCode'],
    name: 'Visual Studio Code',
  },
  {
    bundleIdentifiers: ['com.microsoft.VSCodeInsiders'],
    name: 'Visual Studio Code (Insiders)',
  },
  {
    bundleIdentifiers: ['com.visualstudio.code.oss'],
    name: 'VSCodium',
  },
  {
    bundleIdentifiers: [
      'com.sublimetext.4',
      'com.sublimetext.3',
      'com.sublimetext.2',
    ],
    name: 'Sublime Text',
  },
  {
    bundleIdentifiers: ['com.barebones.bbedit'],
    name: 'BBEdit',
  },
  {
    bundleIdentifiers: ['com.jetbrains.PhpStorm'],
    name: 'PhpStorm',
  },
  {
    bundleIdentifiers: ['com.jetbrains.PyCharm'],
    name: 'PyCharm',
  },
  {
    bundleIdentifiers: ['com.jetbrains.RubyMine'],
    name: 'RubyMine',
  },
  {
    bundleIdentifiers: ['com.macromates.TextMate'],
    name: 'TextMate',
  },
  {
    bundleIdentifiers: ['io.brackets.appshell'],
    name: 'Brackets',
  },
  {
    bundleIdentifiers: ['com.jetbrains.WebStorm'],
    name: 'WebStorm',
  },
  {
    bundleIdentifiers: ['abnerworks.Typora'],
    name: 'Typora',
  },
  {
    bundleIdentifiers: ['com.krill.CodeRunner'],
    name: 'CodeRunner',
  },
  {
    bundleIdentifiers: [
      'com.slickedit.SlickEditPro2018',
      'com.slickedit.SlickEditPro2017',
      'com.slickedit.SlickEditPro2016',
      'com.slickedit.SlickEditPro2015',
    ],
    name: 'SlickEdit',
  },
  {
    bundleIdentifiers: ['com.jetbrains.intellij'],
    name: 'IntelliJ',
  },
  {
    bundleIdentifiers: ['com.apple.dt.Xcode'],
    name: 'Xcode',
  },
  {
    bundleIdentifiers: ['com.jetbrains.goland'],
    name: 'GoLand',
  },
  {
    bundleIdentifiers: ['com.google.android.studio'],
    name: 'Android Studio',
  },
  {
    bundleIdentifiers: ['com.jetbrains.rider'],
    name: 'Rider',
  },
  {
    bundleIdentifiers: ['com.panic.Nova'],
    name: 'Nova',
  },
];

async function findApplication(editor: IDarwinExternalEditor): Promise<string | null> {
  try {
    for (const identifier of editor.bundleIdentifiers) {
      const path: Promise<string> = new Promise(resolve =>
        ipcRenderer.invoke('getAppPath', identifier).then((path: string) => resolve(path))
      );
      const installPath = await path;
      const exists = await pathExists(installPath);
      if (exists) {
        return installPath;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Lookup known external editors using the bundle ID that each uses
 * to register itself on a user's machine when installing.
 */
export async function getAvailableEditors(): Promise<ReadonlyArray<IFoundEditor<string>>> {
  const results: Array<IFoundEditor<string>> = [];

  for (const editor of editors) {
    const path = await findApplication(editor);

    if (path) {
      results.push({ editor: editor.name, path });
    }
  }

  return results;
}

const shells: IDarwinExternalEditor[] = [
  {
    bundleIdentifiers: ['com.apple.Terminal'],
    name: 'Terminal',
  },
  {
    bundleIdentifiers: ['com.googlecode.iterm2'],
    name: 'iTerm2',
  },
  {
    bundleIdentifiers: ['co.zeit.hyper'],
    name: 'Hyper',
  },
  {
    bundleIdentifiers: ['com.microsoft.powershell'],
    name: 'PowerShell Core',
  },
  {
    bundleIdentifiers: ['net.kovidgoyal.kitty'],
    name: 'Kitty',
  },
  {
    bundleIdentifiers: ['io.alacritty'],
    name: 'Alacritty',
  },
];

export async function getAvailableShells(): Promise<ReadonlyArray<IFoundEditor<string>>> {
  const results: Array<IFoundEditor<string>> = [];

  for (const shell of shells) {
    const path = await findApplication(shell);

    if (path) {
      results.push({ editor: shell.name, path });
    }
  }

  return results;
}
