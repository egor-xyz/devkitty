import { autoUpdater } from 'electron';

const server = 'https://update.electronjs.org';
const url = `${server}/egor-xyz/devkitty/${process.platform}-${process.arch}/${app.getVersion()}`;

autoUpdater.setFeedURL({ url });

autoUpdater.on('update-available', () => {
  console.log('update-available');
});

autoUpdater.on('update-downloaded', () => {
  console.log('update-downloaded');
});

autoUpdater.on('update-not-available', () => {
  console.log('update-not-available');
});

try {
  autoUpdater.checkForUpdates();
} catch (e) {
  console.log(e);
}

setInterval(() => {
  autoUpdater.checkForUpdates();
}, 1 * 60 * 1000);
