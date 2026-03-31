import { readFileSync } from 'node:fs';
import { isBuiltin, type LoadHook, type ResolveHook } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ResolverFactory } from 'oxc-resolver';
import { transformSync } from 'oxc-transform';

import { DefaultResolverOptions, DefaultTransformOptions } from './defaults';
import { loadConfigFromEnv, overwriteMerge } from './load-config';

// Source map constants
const SOURCEMAP_PREFIX = '\n//# sourceMappingURL=';
const SOURCEMAP_MIME = 'data:application/json;charset=utf-8;base64,';

// Load config from environment variable (injected by CLI)
const userConfig = loadConfigFromEnv();

// Merge user config with defaults
const config = overwriteMerge(userConfig, {
  transform: DefaultTransformOptions,
  resolver: DefaultResolverOptions,
});

const resolver = new ResolverFactory(config.resolver);

export const resolve: ResolveHook = (specifier, context, nextResolve) => {
  const { parentURL } = context;

  if (!parentURL || isBuiltin(specifier) || specifier.startsWith('node:'))
    return nextResolve(specifier, context);

  const parentPath = fileURLToPath(parentURL);
  const lookupDir = path.dirname(parentPath);

  const resolution = resolver.sync(lookupDir, specifier);

  if (resolution.path) {
    return {
      url: pathToFileURL(resolution.path).href,
      shortCircuit: true,
      format: resolution.moduleType,
    };
  }

  return nextResolve(specifier, context);
};

export const load: LoadHook = (url, context, nextLoad) => {
  if (!url.startsWith('file://')) return nextLoad(url, context);

  const filePath = fileURLToPath(url);
  const ext = filePath.slice(filePath.lastIndexOf('.'));

  if (!['.ts', '.tsx', '.mts', '.cts', '.jsx'].includes(ext)) return nextLoad(url, context);

  const source = readFileSync(filePath, 'utf8');
  const result = transformSync(filePath, source, config.transform);

  if (result.errors.length > 0) {
    const details = result.errors.map((error) => error.codeframe ?? error.message).join('\n\n');
    throw new Error(details);
  }

  let code = result.code;

  if (result.map) {
    const mapString = Buffer.from(JSON.stringify(result.map)).toString('base64');
    const comment = `${SOURCEMAP_PREFIX}${SOURCEMAP_MIME}${mapString}`;
    code = `${code}\n${comment}`;
  }

  return {
    format: 'module',
    source: code,
    shortCircuit: true,
  };
};
