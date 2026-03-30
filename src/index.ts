#!/usr/bin/env node
import { access } from 'fs/promises';
import path from 'path';

import arg from 'arg';

import pakJson from '../package.json' with { type: 'json' };
import { run, watchRun } from './core';

const CLI_NAME = 'RDNO';

const args = arg(
  {
    '--watch': Boolean,
    '-w': '--watch',
    '--help': Boolean,
    '-h': '--help',
    '--version': Boolean,
    '-v': '--version',
  },
  {
    permissive: true,
    argv: process.argv.slice(2),
  },
);

if (args['--version']) {
  console.log(`${CLI_NAME}/v${pakJson.version} ${process.platform} ${process.versions.node}`);
  process.exit(0);
}

if (args['--help']) {
  console.log(`Usage: ${CLI_NAME} [options] <file>`);
  console.log('');
  console.log('Options:');
  console.log('  -w, --watch      Watch mode');
  console.log('  -h, --help       Show help');
  console.log('  -v, --version    Show version');
  process.exit(0);
}

const [entry, ...extraArgs] = args._;

if (entry === undefined) {
  console.error('No entry file specified');
  process.exit(1);
}

const entryPath = path.normalize(path.resolve(process.cwd(), entry));

access(entryPath).catch(() => {
  console.error(`Entry file ${entry} does not exist`);
  process.exit(1);
});

if (args['--watch']) {
  await watchRun(entryPath, extraArgs);
} else {
  await run(entryPath, extraArgs);
}

process.on('SIGINT', () => process.exit(0));
