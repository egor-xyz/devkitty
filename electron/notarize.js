require('dotenv').config();
process.env.DEBUG = 'electron-notarize*';
const { notarize } = require('electron-notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  const appName = context.packager.appInfo.productFilename;

  if (process.env.NO_SIGN || electronPlatformName !== 'darwin') return;

  return await notarize({
    appBundleId: 'C86YDU5H8W',
    appleApiIssuer: process.env.API_KEY_ISSUER_ID,
    appleApiKey: process.env.API_KEY_ID,
    appPath: `${appOutDir}/${appName}.app`
  });
};
