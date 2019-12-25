function getAppMenu(mainWindow, app) {
  const template = [
    {
      label: 'devkitty',
      submenu: [
        {
          enabled: false,
          label: `Version ${app.getVersion()}`,
        },
        { type: 'separator' },
        {
          accelerator: 'Ctrl+A',
          click: () => { mainWindow.webContents.send('dispatch', 'toggleAbout') },
          label: '&About'
        },
        {
          click: () => { mainWindow.webContents.send('dispatch', 'viewLicense') },
          label: 'View &License'
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          click: () => {
            mainWindow.webContents.send('dispatch', 'addFolder');
          },
          label: 'Add project',
        },
        {
          click: () => {
            mainWindow.webContents.send('dispatch', 'addFolders');
          },
          label: 'Add projects',
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'viewMenu' },
        {
          accelerator: 'Ctrl+I',
          click: () => mainWindow.webContents.send('dispatch', 'toggle', 'projectInfo'),
          label: 'Show/Hide project &info'
        },
        {
          accelerator: 'Ctrl+B',
          click: () => mainWindow.webContents.send('dispatch', 'toggle', 'bottomBar'),
          label: 'Show/Hide &Bottom Bar'
        },
        {
          accelerator: 'Cmd+R',
          click: () => mainWindow.webContents.send('dispatch', 'scanFolders'),
          label: 'Refresh projects'
        },
      ]
    },
    {
      label: 'Import/export',
      submenu: [
        {
          click: () => mainWindow.webContents.send('dispatch', 'importSettings'),
          label: 'Import from a file (JSON)',
        },
        {
          click: () => mainWindow.webContents.send('dispatch', 'exportSetttings'),
          label: 'Export to a file (JSON)',
        },
        {
          click: () => require('open')(require('electron-settings').file()),
          label: 'Open config file',
        }
      ]
    },
    { role: 'editMenu' },
    { role: 'windowMenu' },
    { role: 'helpMenu' },
  ];
  return template.filter(item => !!item);
}

module.exports = { getAppMenu };