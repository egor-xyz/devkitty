import appPath from 'app-path';
import log from 'electron-log';

import { pathExists } from '../path-exists';
import { FoundEditor } from '../../../types/foundEditor';

/** Represents an external editor on macOS */
interface IDarwinExternalEditor {
  /**
   * List of bundle identifiers that are used by the app in its multiple
   * versions.
   **/
  readonly bundleIdentifiers: string[];

  /** Name of the editor. It will be used both as identifier and user-facing. */
  readonly name: string;
}

/**
 * This list contains all the external editors supported on macOS. Add a new
 * entry here to add support for your favorite editor.
 **/
const editors: IDarwinExternalEditor[] = [
  {
    bundleIdentifiers: ['com.github.atom'],
    name: 'Atom'
  },
  {
    bundleIdentifiers: ['aptana.studio'],
    name: 'Aptana Studio'
  },
  {
    bundleIdentifiers: ['org.vim.MacVim'],
    name: 'MacVim'
  },
  {
    bundleIdentifiers: ['com.neovide.neovide'],
    name: 'Neovide'
  },
  {
    bundleIdentifiers: ['com.qvacua.VimR'],
    name: 'VimR'
  },
  {
    bundleIdentifiers: ['com.microsoft.VSCode'],
    name: 'Visual Studio Code'
  },
  {
    bundleIdentifiers: ['com.microsoft.VSCodeInsiders'],
    name: 'Visual Studio Code (Insiders)'
  },
  {
    bundleIdentifiers: ['com.visualstudio.code.oss', 'com.vscodium'],
    name: 'VSCodium'
  },
  {
    bundleIdentifiers: ['com.sublimetext.4', 'com.sublimetext.3', 'com.sublimetext.2'],
    name: 'Sublime Text'
  },
  {
    bundleIdentifiers: ['com.barebones.bbedit'],
    name: 'BBEdit'
  },
  {
    bundleIdentifiers: ['com.jetbrains.PhpStorm'],
    name: 'PhpStorm'
  },
  {
    bundleIdentifiers: ['com.jetbrains.PyCharm'],
    name: 'PyCharm'
  },
  {
    bundleIdentifiers: ['com.jetbrains.pycharm.ce'],
    name: 'PyCharm Community Edition'
  },
  {
    bundleIdentifiers: ['com.jetbrains.DataSpell'],
    name: 'DataSpell'
  },
  {
    bundleIdentifiers: ['com.jetbrains.RubyMine'],
    name: 'RubyMine'
  },
  {
    bundleIdentifiers: ['org.rstudio.RStudio', 'com.rstudio.desktop'],
    name: 'RStudio'
  },
  {
    bundleIdentifiers: ['com.macromates.TextMate'],
    name: 'TextMate'
  },
  {
    bundleIdentifiers: ['io.brackets.appshell'],
    name: 'Brackets'
  },
  {
    bundleIdentifiers: ['com.jetbrains.WebStorm'],
    name: 'WebStorm'
  },
  {
    bundleIdentifiers: ['com.jetbrains.CLion'],
    name: 'CLion'
  },
  {
    bundleIdentifiers: ['abnerworks.Typora'],
    name: 'Typora'
  },
  {
    bundleIdentifiers: ['com.krill.CodeRunner'],
    name: 'CodeRunner'
  },
  {
    bundleIdentifiers: [
      'com.slickedit.SlickEditPro2018',
      'com.slickedit.SlickEditPro2017',
      'com.slickedit.SlickEditPro2016',
      'com.slickedit.SlickEditPro2015'
    ],
    name: 'SlickEdit'
  },
  {
    bundleIdentifiers: ['com.jetbrains.intellij'],
    name: 'IntelliJ'
  },
  {
    bundleIdentifiers: ['com.jetbrains.intellij.ce'],
    name: 'IntelliJ Community Edition'
  },
  {
    bundleIdentifiers: ['com.apple.dt.Xcode'],
    name: 'Xcode'
  },
  {
    bundleIdentifiers: ['com.jetbrains.goland'],
    name: 'GoLand'
  },
  {
    bundleIdentifiers: ['com.google.android.studio'],
    name: 'Android Studio'
  },
  {
    bundleIdentifiers: ['com.jetbrains.rider'],
    name: 'Rider'
  },
  {
    bundleIdentifiers: ['com.panic.Nova'],
    name: 'Nova'
  },
  {
    bundleIdentifiers: ['org.gnu.Emacs'],
    name: 'Emacs'
  },
  {
    bundleIdentifiers: ['com.lite-xl'],
    name: 'Lite XL'
  },
  {
    bundleIdentifiers: ['Fleet.app'],
    name: 'Fleet'
  },
  {
    bundleIdentifiers: ['dev.pulsar-edit.pulsar'],
    name: 'Pulsar'
  },
  {
    bundleIdentifiers: ['dev.zed.Zed'],
    name: 'Zed'
  }
];

async function findApplication(editor: IDarwinExternalEditor): Promise<string | null> {
  for (const identifier of editor.bundleIdentifiers) {
    try {
      // app-path not finding the app isn't an error, it just means the
      // bundle isn't registered on the machine.
      // https://github.com/sindresorhus/app-path/blob/0e776d4e132676976b4a64e09b5e5a4c6e99fcba/index.js#L7-L13
      const installPath = await appPath(identifier).catch((e) =>
        e.message === "Couldn't find the app" ? Promise.resolve(null) : Promise.reject(e)
      );

      if (installPath && (await pathExists(installPath))) {
        return installPath;
      }

      // log.debug(`App installation for ${editor.name} not found at '${installPath}'`);
    } catch (error) {
      log.debug(`Unable to locate ${editor.name} installation`, error);
    }
  }

  return null;
}

/**
 * Lookup known external editors using the bundle ID that each uses
 * to register itself on a user's machine when installing.
 */
export async function getAvailableEditors(): Promise<ReadonlyArray<FoundEditor>> {
  const results: Array<FoundEditor> = [];

  for (const editor of editors) {
    const path = await findApplication(editor);

    if (path) {
      results.push({ editor: editor.name, path });
    }
  }

  return results;
}
