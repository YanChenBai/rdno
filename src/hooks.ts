import { readFileSync } from 'node:fs';
import { isBuiltin, type ResolveHook, type LoadHook } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ResolverFactory } from 'oxc-resolver';
import { transformSync } from 'oxc-transform';

const isDev = process.env.NODE_ENV !== 'production';
const SOURCEMAP_PREFIX = '\n//# sourceMappingURL=';
const SOURCEMAP_MIME = 'data:application/json;charset=utf-8;base64,';

const resolver = new ResolverFactory({
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts', 'cjs', 'cts', '.es6', 'es'],
  conditionNames: ['import', 'node', 'development', 'dev'],
  mainFields: ['source', 'module', 'main'],
  exportsFields: ['exports'],
  modules: ['node_modules'],
  symlinks: true,
  tsconfig: 'auto',
});

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
    };
  }

  return nextResolve(specifier, context);
};

export const load: LoadHook = (url, context, nextLoad) => {
  if (!url.startsWith('file://')) return nextLoad(url, context);

  const filePath = fileURLToPath(url);
  const ext = path.extname(filePath);

  if (!['.ts', '.tsx', '.mts', '.cts', '.jsx'].includes(ext)) return nextLoad(url, context);

  const source = readFileSync(filePath, 'utf8');

  const result = transformSync(filePath, source, {
    sourcemap: true,
    sourceType: 'module',
    target: 'esnext',
    typescript: {
      onlyRemoveTypeImports: true,
      rewriteImportExtensions: true,
    },
    jsx: {
      runtime: 'automatic',
      importSource: 'react',
      development: isDev,
      pure: true,
    },
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
    define: {
      'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
      __DEV__: String(isDev),
      __PROD__: String(!isDev),
    },
  });

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
