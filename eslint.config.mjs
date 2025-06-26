import config from '@egor.xyz/eslint-config';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // ignore files and folders from root: node_modules, dist, build, *.js, *.ts
    ignores: ['node_modules', 'dist', 'build', '*.js', '*.ts', '.tmp', '.vite']
  },
  {
    extends: config,
    files: ['**/*.{ts,tsx}']
  }
);
