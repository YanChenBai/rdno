import { readFile } from 'node:fs/promises';
import { isBuiltin, type ResolveHook, type LoadHook } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ResolverFactory } from 'oxc-resolver';
import { transform } from 'oxc-transform';

const resolver = new ResolverFactory({
  extensions: ['.ts', '.tsx', '.mts', '.json'],
  conditionNames: ['import', 'node', 'development', 'dev'],
  mainFields: ['source', 'module', 'main'],
  symlinks: true,
  tsconfig: 'auto',
});

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  const { parentURL } = context;

  if (!parentURL || isBuiltin(specifier) || specifier.startsWith('node:'))
    return nextResolve(specifier, context);

  try {
    const parentPath = fileURLToPath(parentURL);
    const lookupDir = path.dirname(parentPath);

    const resolution = await resolver.async(lookupDir, specifier);

    if (resolution.path) {
      return {
        url: pathToFileURL(resolution.path).href,
        shortCircuit: true,
      };
    }
  } catch (error) {
    console.error(`[RDNO] Error resolving ${specifier}: ${error}`);
  }

  return nextResolve(specifier, context);
};

export const load: LoadHook = async (url, context, nextLoad) => {
  if (url.startsWith('file://')) {
    const filePath = fileURLToPath(url);
    const ext = path.extname(filePath);

    if (['.ts', '.tsx', '.mts'].includes(ext)) {
      try {
        const source = await readFile(filePath, 'utf8');

        const result = await transform(filePath, source, {
          sourcemap: true,
          sourceType: 'module',
          target: 'esnext',
          typescript: {},
        });

        return {
          format: 'module',
          source: result.code,
          shortCircuit: true,
        };
      } catch (error) {
        console.error(`[RDNO] Failed to load ${url}:`, error);
      }
    }
  }

  return nextLoad(url, context);
};
