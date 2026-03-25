#!/usr/bin/env node
import { cac } from 'cac';

import { run, watch } from './core';

const cli = cac('rdno');

cli
  .command('<file>', 'Run a TS file')
  .option('-w, --watch', 'Watch mode')
  .option('--format <format>', 'Bundle format', { default: 'es' })
  .action(async (entry, options) => {
    if (options.watch) {
      await watch(entry);
      return;
    }

    const child = await run(entry);

    child.on('exit', (code) => process.exit(code ?? 0));
  });

cli.help();
cli.parse();

process.on('SIGINT', () => {
  process.exit(0);
});
