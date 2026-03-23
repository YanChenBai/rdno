import { promises as fs } from 'fs';

import { cac } from 'cac';

import { resolveCacheDir, run, watch } from './core';

const cli = cac('rdno');

cli
  .command('<file>', 'Run a TS file')
  .option('-w, --watch', 'Watch mode')
  .option('--format <format>', 'Bundle format', { default: 'es' })
  .action(async (file, options) => {
    const cwd = process.cwd();
    await fs.mkdir(resolveCacheDir(cwd), { recursive: true });

    if (options.watch) {
      await watch({ entry: file, format: options.format, cwd });
      return;
    }

    const child = await run({ entry: file, format: options.format, cwd });

    child.on('exit', (code) => process.exit(code ?? 0));
  });

cli.help();
cli.parse();

process.on('SIGINT', () => {
  process.exit(0);
});
