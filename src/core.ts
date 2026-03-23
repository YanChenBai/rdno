import { spawn, type ChildProcess } from 'child_process';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path, { isAbsolute, join, relative, resolve } from 'path';

import watcher from '@parcel/watcher';
import { rolldown, type ModuleFormat } from 'rolldown';

import { version } from '../package.json';

export interface Options {
  entry: string;
  cwd?: string;
  format?: ModuleFormat;
}

export const resolveCacheDir = (cwd: string) => join(cwd, 'node_modules', '.cache', 'rdno');

export async function resolveCachePath({ entry, cwd = process.cwd(), format = 'es' }: Options) {
  const absEntry = isAbsolute(entry) ? entry : resolve(cwd, entry);
  const relPath = relative(cwd, absEntry);

  const mtime = await fs.stat(absEntry).then(
    (stat) => stat.mtimeMs,
    () => 0,
  );

  const metaString = `${relPath}:${format}:${version}:${mtime}`;
  const hash = createHash('md5').update(metaString).digest('hex');

  const ext = path.extname(relPath);
  const flatName = relPath.replace(ext, '').replace(/[\\/]/g, '_');

  const cacheName = `${flatName}_${ext.replace('.', '')}_${hash}.js`;

  return join(resolveCacheDir(cwd), cacheName);
}

export async function build({ entry, cwd = process.cwd(), format = 'es' }: Options) {
  const file = await resolveCachePath({ entry, cwd, format });

  const bundle = await rolldown({
    input: entry,
    tsconfig: true,
    platform: 'node',
    treeshake: false,
    external: (id) => !id.startsWith('.') && !id.startsWith('/') && !path.isAbsolute(id),
  });

  await bundle.write({
    format,
    file,
    sourcemap: true,
  });

  return { bundle, file };
}

export async function run({ entry, cwd = process.cwd(), format = 'es' }: Options) {
  const { file } = await build({ entry, cwd, format });

  return spawn('node', [file], {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: '--enable-source-maps',
    },
  });
}

export async function watch({ entry, cwd = process.cwd(), format = 'es' }: Options) {
  let child: ChildProcess | null = null;
  const start = () => run({ entry, cwd, format });

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
