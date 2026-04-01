import type { NapiResolveOptions } from 'oxc-resolver';
import type { TransformOptions } from 'oxc-transform';

export interface RdnoConfig {
  /**
   * Oxc transform options
   * @default
   * {
   *    sourcemap: true,
   *    sourceType: 'module',
   *    target: 'esnext',
   *    typescript: {
   *        onlyRemoveTypeImports: true,
   *        rewriteImportExtensions: true,
   *    },
   *    jsx: {
   *        runtime: 'automatic',
   *        importSource: 'react',
   *        development:  process.env.NODE_ENV !== 'production',
   *        pure: true,
   *    },
   *    decorator: {
   *        legacy: true,
   *        emitDecoratorMetadata: true,
   *    },
   *    define: {
   *        'process.env.NODE_ENV':  process.env.NODE_ENV !== 'production' ? '"development"' : '"production"',
   *    },
   * }
   */
  transform?: TransformOptions;

  /**
   * Oxc resolver options
   * @default
   * {
   *    tsconfig: 'auto',
   *    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts','.es6', 'es'],
   *    conditionNames: ['import', 'node', 'development', 'dev'],
   *    mainFields: ['source', 'module', 'main'],
   *    exportsFields: ['exports'],
   *    modules: ['node_modules'],
   *    symlinks: true,
   * }
   */
  resolver?: NapiResolveOptions;
}

export function defineConfig(config: RdnoConfig) {
  return config;
}
