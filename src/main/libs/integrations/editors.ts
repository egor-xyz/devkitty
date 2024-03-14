type Editor = {
  bundleIdentifiers: string[];
  name: string;
};

const editors: Editor[] = [
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

export const editorNames = editors.map((editor) => editor.name);
