import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'path';

import { createDefu } from 'defu';

import type { RdnoConfig } from './config';

const CONFIG_FILE_EXTS = ['.js', '.ts', '.mjs', '.mts', '.cjs', '.cts'];
const CONFIG_FILES = CONFIG_FILE_EXTS.map((ext) => `rdno.config${ext}`);

const ROOT_PATTERN = /^node_modules$/;

// Markers for extracting config output from subprocess
const CONFIG_START_MARKER = '__RDNO_CONFIG_START__';
const CONFIG_END_MARKER = '__RDNO_CONFIG_END__';

function testFile(filePath: string) {
  try {
    if (statSync(filePath).isFile()) {
      return true;
    }
  } catch {
    // Ignore
  }
}

export const overwriteMerge = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key]) && Array.isArray(value)) {
    obj[key] = value;
    return true;
  }
});

export function findFile(filename: string[]): string | null {
  const filenames = Array.isArray(filename) ? filename : [filename];
  const basePath = resolve(process.cwd());
  const leadingSlash = basePath[0] === '/';
  const segments = basePath.split('/').filter(Boolean);

  // Test input itself first
  if (filenames.includes(segments.at(-1)!) && testFile(basePath)) {
    return basePath;
  }

  // Restore leading slash
  if (leadingSlash) {
    segments[0] = '/' + segments[0];
  }

  // Limit to node_modules scope if it exists
  let root = segments.findIndex((r) => r.match(ROOT_PATTERN));
  if (root === -1) {
    root = 0;
  }

  for (let index = segments.length; index > root; index--) {
    for (const filename of filenames) {
      const filePath = join(...segments.slice(0, index), filename);
      if (testFile(filePath)) {
        return filePath;
      }
    }
  }

  return null;
}

export function findConfigPath() {
  const configPath = findFile(CONFIG_FILES);

  return configPath;
}

export function loadConfigJson(): string | undefined {
  const configFilePath = findConfigPath();

  if (!configFilePath) {
    return JSON.stringify({ transform: {}, resolver: {} });
  }

  const cwd = dirname(configFilePath);
  const configUrl = pathToFileURL(configFilePath).href;

  const args = [
    'node',
    '--import',
    new URL('./register.mjs', import.meta.url).href,
    '-e',
    `"import(\`${configUrl}\`).then(m=>console.log('${CONFIG_START_MARKER}' + JSON.stringify(m.default || m) + '${CONFIG_END_MARKER}'))"`,
  ];

  const output = execSync(args.join(' '), { encoding: 'utf-8', cwd });

  // Extract JSON between markers
  const match = output.match(new RegExp(`${CONFIG_START_MARKER}(.+?)${CONFIG_END_MARKER}`, 's'));

  if (!match?.[1]) {
    // Fallback to empty config if no valid output
    return;
  }

  // Return JSON string directly, avoid parsing
  return match[1];
}

export function loadConfigFromEnv(): RdnoConfig {
  if (!process.env.RDNO_CONFIG) {
    return { transform: {}, resolver: {} };
  }
  try {
    return JSON.parse(process.env.RDNO_CONFIG);
  } catch {
    console.error(
      '[RDNO] Invalid RDNO_CONFIG environment variable. Please check your configuration.',
    );
    return { transform: {}, resolver: {} };
  }
}
