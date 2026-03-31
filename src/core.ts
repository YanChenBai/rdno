import { spawn, type ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

import watcher from '@parcel/watcher';

export interface RunOptions {
  entry: string;
  extraArgs?: string[];
  configJson?: string;
}

export async function run(options: RunOptions) {
  const { entry, extraArgs = [], configJson } = options;
  const cwd = process.cwd();
  const cwdNodeModules = path.join(cwd, 'node_modules');
  const cwdNodeModulesExists = await fs
    .access(cwdNodeModules)
    .then(() => true)
    .catch(() => false);

  const NODE_PATH = [process.env.NODE_PATH ?? '', cwdNodeModulesExists ? cwdNodeModules : '']
    .filter(Boolean)
    .join(path.delimiter);

  return spawn(
    'node',
    [
      '--enable-source-maps',
      '--import',
      new URL('./register.mjs', import.meta.url).href,
      entry,
      ...extraArgs,
    ],
    {
      cwd,
      stdio: `inherit`,
      env: {
        ...process.env,
        NODE_PATH,
        RDNO_CONFIG: configJson,
      },
    },
  );
}

export async function watchRun(options: RunOptions) {
  const cwd = process.cwd();
  let child: ChildProcess | null = null;
  const start = () => run(options);

  child = await start();

  return await watcher.subscribe(
    cwd,
    async (err) => {
      child?.kill('SIGTERM');

      if (!err) child = await start();
    },
    {
      ignore: [
        'node_modules',
        '.cache',
        'dist',
        'build',
        'coverage',
        '*.tsbuildinfo',
        '.git',
        '*.log',
        '*.lock',
        '*.map',
        '*.snap',
        '*.tmp',
      ],
    },
  );
}
