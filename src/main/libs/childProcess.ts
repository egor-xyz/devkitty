import { exec } from 'child_process';

export const execAsync = (command: string) => new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
