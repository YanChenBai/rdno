import { describe, expect, it } from 'vite-plus/test';

import type { RdnoConfig } from '../src/config';
import { overwriteMerge } from '../src/load-config';

describe('load-config: overwriteMerge', () => {
  it('应该深度合并对象', () => {
    const defaults = {
      transform: {
        sourcemap: true,
        typescript: { onlyRemoveTypeImports: true },
      },
      resolver: {
        symlinks: true,
        extensions: ['.ts', '.js'],
      },
    };

    const userConfig = {
      transform: {
        sourcemap: false,
        jsx: { runtime: 'automatic' },
      },
      resolver: {
        symlinks: false,
      },
    };

    // defu 会修改第一个对象并返回它
    const result = overwriteMerge(userConfig, { ...defaults });

    expect(result).toEqual({
      transform: {
        sourcemap: false,
        typescript: { onlyRemoveTypeImports: true },
        jsx: { runtime: 'automatic' },
      },
      resolver: {
        symlinks: false,
        extensions: ['.ts', '.js'],
      },
    });
  });

  it('应该覆盖数组而不是合并', () => {
    const defaults = {
      resolver: {
        extensions: ['.ts', '.js', '.tsx'],
        conditionNames: ['import', 'node'],
      },
    };

    const userConfig = {
      resolver: {
        extensions: ['.mts', '.mjs'],
      },
    };

    // defu 会修改第一个对象并返回它
    const result = overwriteMerge(userConfig, { ...defaults });

    expect(result.resolver.extensions).toEqual(['.mts', '.mjs']);
    expect(result.resolver.conditionNames).toEqual(['import', 'node']);
  });

  it('应该处理空用户配置', () => {
    const defaults: RdnoConfig = {
      transform: { sourcemap: true },
      resolver: { symlinks: true },
    };

    const userConfig: RdnoConfig = {};

    const result = overwriteMerge(userConfig, { ...defaults });

    expect(result).toEqual(defaults);
  });

  it('应该处理嵌套的空对象', () => {
    const defaults = {
      transform: {
        sourcemap: true,
        typescript: { onlyRemoveTypeImports: true },
      },
    };

    const userConfig = {
      transform: {},
    };

    const result = overwriteMerge(userConfig, { ...defaults });

    expect(result.transform).toEqual({
      sourcemap: true,
      typescript: { onlyRemoveTypeImports: true },
    });
  });

  it('应该添加新的属性而不影响现有属性', () => {
    const defaults = {
      transform: {
        sourcemap: true,
      },
    };

    const userConfig = {
      transform: {
        target: 'es2020',
      },
      resolver: {
        symlinks: false,
      },
    };

    const result = overwriteMerge(userConfig, { ...defaults });

    expect(result).toEqual({
      transform: {
        sourcemap: true,
        target: 'es2020',
      },
      resolver: {
        symlinks: false,
      },
    });
  });

  it('应该处理 null 和 undefined 值', () => {
    const defaults = {
      transform: {
        sourcemap: true,
        define: { __DEV__: 'true' },
      },
    };

    const userConfig = {
      transform: {
        define: undefined,
      },
    };

    const result = overwriteMerge(userConfig, { ...defaults });

    // defu 默认行为会保留 undefined
    expect(result.transform.sourcemap).toBe(true);
  });
});
