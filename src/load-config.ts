import { readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'path';

import { createDefu } from 'defu';
import { transformSync } from 'oxc-transform';

import type { RdnoConfig } from './config';

const CONFIG_FILE_EXTS = ['.js', '.ts', '.mjs', '.mts', '.cjs', '.cts'];
const CONFIG_FILES = CONFIG_FILE_EXTS.map((ext) => `rdno.config${ext}`);

const ROOT_PATTERN = /^node_modules$/;

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
  } else if (typeof obj[key] === 'object' && typeof value === 'object') {
    obj[key] = overwriteMerge(obj[key], value);
    return true;
  }
});

export async function loadConfig(): Promise<RdnoConfig> {
  const configFilePath = findFile(CONFIG_FILES);

  if (!configFilePath)
    return {
      transform: {},
      resolver: {},
    };

  const source = readFileSync(configFilePath, 'utf8');

  const { code } = transformSync(configFilePath, source, {
    sourceType: 'module',
    target: 'esnext',
    typescript: {
      onlyRemoveTypeImports: true,
      rewriteImportExtensions: true,
    },
  });

  const base64 = Buffer.from(code).toString('base64');
  const moduleURL = `data:text/javascript;base64,${base64}`;

  const config = await import(moduleURL);
  return config.default || config;
}

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
