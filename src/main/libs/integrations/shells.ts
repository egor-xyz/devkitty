type Shell = {
  bundleIdentifiers: string[];
  name: string;
};

const shells: Shell[] = [
  {
    bundleIdentifiers: ['com.apple.Terminal'],
    name: 'Terminal'
  },
  {
    bundleIdentifiers: ['dev.warp.Warp-Stable'],
    name: 'Warp'
  },
  {
    bundleIdentifiers: ['com.googlecode.iterm2'],
    name: 'iTerm2'
  },
  {
    bundleIdentifiers: ['co.zeit.hyper'],
    name: 'Hyper'
  },
  {
    bundleIdentifiers: ['net.kovidgoyal.kitty'],
    name: 'Kitty'
  },
  {
    bundleIdentifiers: ['io.alacritty'],
    name: 'Alacritty'
  },
  {
    bundleIdentifiers: ['org.tabby'],
    name: 'Tabby'
  },
  {
    bundleIdentifiers: ['com.github.wez.wezterm'],
    name: 'WezTerm'
  }
];

export const shellNames = shells.map((shell) => shell.name);
