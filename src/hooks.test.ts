import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();
  return {
    ...actual,
    isBuiltin: vi.fn(),
  };
});

vi.mock('oxc-resolver', () => {
  let syncMock: ReturnType<typeof vi.fn>;

  class MockResolverFactory {
    constructor() {}
    sync = syncMock;
  }

  const mockFactory = MockResolverFactory as unknown as typeof MockResolverFactory & {
    _setSyncMock: (mock: ReturnType<typeof vi.fn>) => void;
  };

  mockFactory._setSyncMock = (mock) => {
    syncMock = mock;
  };

  return {
    ResolverFactory: mockFactory,
  };
});

vi.mock('oxc-transform', () => ({
  transformSync: vi.fn(),
}));

import { readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';

import { ResolverFactory } from 'oxc-resolver';
import { transformSync } from 'oxc-transform';

const readFileSyncMock = vi.mocked(readFileSync);
const isBuiltinMock = vi.mocked(isBuiltin);
const transformSyncMock = vi.mocked(transformSync);

describe('hooks', () => {
  let resolverSyncMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    isBuiltinMock.mockReturnValue(false);
    resolverSyncMock = vi.fn();
    (ResolverFactory as any)._setSyncMock(resolverSyncMock);
  });

  it('should resolve: delegate builtins, find files, and fallback', async () => {
    const { resolve } = await import('./hooks');

    // 内置模块委托
    isBuiltinMock.mockReturnValue(true);
    const nextResolve = vi.fn().mockResolvedValue({ url: 'node:path' });
    await resolve(
      'fs',
      { parentURL: 'file:///a.ts', conditions: [], importAttributes: {} },
      nextResolve,
    );
    expect(nextResolve).toHaveBeenCalledTimes(1);

    // 成功解析
    isBuiltinMock.mockReturnValue(false);
    resolverSyncMock.mockReturnValue({ path: '/repo/x.ts' });
    const result = await resolve(
      './x',
      { parentURL: 'file:///C:/repo/a.ts', conditions: [], importAttributes: {} },
      vi.fn(),
    );
    expect(result.shortCircuit).toBe(true);
    expect(result.url).toMatch(/^file:\/\//);

    // 回退
    resolverSyncMock.mockReturnValue({});
    const nextResolve2 = vi.fn().mockResolvedValue({ url: 'fallback' });
    await resolve(
      './y',
      { parentURL: 'file:///C:/repo/a.ts', conditions: [], importAttributes: {} },
      nextResolve2,
    );
    expect(nextResolve2).toHaveBeenCalledTimes(1);
  });

  it('should load: delegate non-TS, transform TS, and throw on errors', async () => {
    const { load } = await import('./hooks');

    // 非 TS 文件委托
    const nextLoad = vi.fn().mockResolvedValue({ format: 'module' });
    await load(
      'file:///C:/x.js',
      { conditions: [], format: 'module', importAttributes: {} },
      nextLoad,
    );
    expect(nextLoad).toHaveBeenCalledTimes(1);
    expect(readFileSyncMock).not.toHaveBeenCalled();

    // TS 文件转换
    readFileSyncMock.mockReturnValue('source');
    transformSyncMock.mockReturnValue({ code: 'transpiled', errors: [], helpersUsed: {} });
    const result = load(
      'file:///C:/x.ts',
      { conditions: [], format: 'module', importAttributes: {} },
      vi.fn(),
    );
    expect(transformSyncMock).toHaveBeenCalledWith(
      expect.any(String),
      'source',
      expect.objectContaining({ sourcemap: true, sourceType: 'module' }),
    );
    expect(result).toEqual({ format: 'module', source: 'transpiled', shortCircuit: true });

    // 转换错误抛出
    readFileSyncMock.mockReturnValue('bad');
    transformSyncMock.mockReturnValue({
      code: '',
      errors: [
        { severity: 'Error', message: 'error', labels: [], helpMessage: null, codeframe: null },
      ],
      helpersUsed: {},
    } as any);
    expect(() =>
      load('file:///C:/x.ts', { conditions: [], format: 'module', importAttributes: {} }, vi.fn()),
    ).toThrow();
  });
});
