import { exec } from 'child_process';

const getAppsSubDirectory = (stdout: string, directory: string): string[] => {
  let stdoutArr = stdout.split(/[(\r\n)\r\n]+/);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stdoutArr = stdoutArr.filter((o: any) => o).map((i: any) => `${directory}/${i}`);
  return stdoutArr;
};

const getDirectoryContents = (directory: string): Promise<string[]> =>
  new Promise((resolve, reject) => {
    exec(`ls ${directory}`, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        try {
          resolve(getAppsSubDirectory(stdout, directory));
        } catch (err) {
          reject(err);
        }
      }
    });
  });

export const getInstalledApps = async (directory: string): Promise<string[]> => {
  try {
    return await getDirectoryContents(directory);
  } catch {
    return [];
  }
};
