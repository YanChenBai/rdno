#!/usr/bin/env node
import { access } from 'fs/promises';
import path from 'path';

import arg from 'arg';

import pakJson from '../package.json' with { type: 'json' };
import { run, watchRun } from './core';
import { findConfigPath, loadConfigJson } from './load-config';

const CLI_NAME = 'RDNO';
const configJson = loadConfigJson();

const R = '\x1b[0m';
const B = '\x1b[1m';
const GRAY = '\x1b[90m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';

const args = arg(
  {
    '--watch': Boolean,
    '-w': '--watch',
    '--help': Boolean,
    '-h': '--help',
    '--version': Boolean,
    '-v': '--version',
    '--config-path': Boolean,
    '-p': '--config-path',
  },
  {
    permissive: true,
    argv: process.argv.slice(2),
  },
);

if (args['--version']) {
  const isProd = process.env.NODE_ENV === 'production';
  const modeTag = isProd ? `${GREEN}PRODUCTION${R}` : `${YELLOW}DEVELOPMENT${R}`;
  const labelWidth = 10;

  console.log(
    `\n${MAGENTA}${B} (๑•̀ㅂ•́)و✧  ${CLI_NAME} ${R}\n` +
      `${GRAY} ├─ ${'Version:'.padEnd(labelWidth)} ${CYAN}v${pakJson.version}${R}\n` +
      `${GRAY} ├─ ${'Mode:'.padEnd(labelWidth)} ${modeTag}\n` +
      `${GRAY} ├─ ${'Platform:'.padEnd(labelWidth)} ${R}${process.platform}-${process.arch}\n` +
      `${GRAY} └─ ${'Engine:'.padEnd(labelWidth)} ${R}Node ${process.versions.node}${R}\n`,
  );
  process.exit(0);
}

if (args['--help']) {
  console.log(`\n${MAGENTA}${B}${CLI_NAME} Help ${R}`);

  console.log(`\n${B} USAGE ${R}`);
  console.log(`  $ ${CYAN}${CLI_NAME.toLowerCase()}${R} [options] <file>`);

  console.log(`\n${B} OPTIONS ${R}`);
  console.log(`  ${CYAN}-w, --watch${R}    ${GRAY}Watch mode (monitor file changes)${R}`);
  console.log(`  ${CYAN}-v, --version${R}  ${GRAY}Display version information)${R}`);
  console.log(`  ${CYAN}-h, --help${R}     ${GRAY}Show this help message)${R}`);
  console.log(`  ${CYAN}-p, --config-path${R}  ${GRAY}Display config file path)${R}`);

  console.log(`\n${B} EXAMPLE ${R}`);
  console.log(`  ${GRAY}$${R} ${CLI_NAME.toLowerCase()} src/index.ts --watch`);

  console.log(`\n${MAGENTA}${B} (๑•̀ㅂ•́)و✧  Ready to boost! ${R}\n`);
  process.exit(0);
}

if (args['--config-path']) {
  console.log(`\n${MAGENTA}${B} ( ￣▽￣)o  Locating Config ${R}`);
  console.log(`  ${GRAY}Path:${R} ${CYAN}${findConfigPath() ?? 'Not found'}${R}\n`);
  process.exit(0);
}

const [entry, ...extraArgs] = args._;

if (entry === undefined) {
  console.error(`\n${RED}${B} ERROR ${R} No entry file specified (っ °Д °;)っ\n`);
  process.exit(1);
}

const entryPath = path.normalize(path.resolve(process.cwd(), entry));

try {
  await access(entryPath);
} catch {
  console.error(
    `\n${RED}${B} ERROR ${R} Entry file not found: ${YELLOW}${entry}${R} (っ °Д °;)っ\n`,
  );
  process.exit(1);
}

const modeLabel = args['--watch'] ? 'WATCHING' : 'RUNNING';
console.log(`${MAGENTA}${B} ${modeLabel} ${R} ${CYAN}${path.basename(entryPath)}${R}`);

if (args['--watch']) {
  await watchRun({ entry: entryPath, extraArgs, configJson });
} else {
  await run({ entry: entryPath, extraArgs, configJson });
}

process.on('SIGINT', () => {
  console.log(`\n${YELLOW} Process terminated. Bye! ${R}`);
  process.exit(0);
});
