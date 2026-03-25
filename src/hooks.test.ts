import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const readFileMock = vi.fn();
const isBuiltinMock = vi.fn();
const resolverAsyncMock = vi.fn();
const transformMock = vi.fn();

vi.mock('node:fs/promises', () => ({
  readFile: readFileMock,
}));

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:module')>();

  return {
    ...actual,
    isBuiltin: isBuiltinMock,
  };
});

vi.mock('oxc-resolver', () => ({
  ResolverFactory: vi.fn(
    class {
      async = resolverAsyncMock;
    },
  ),
}));

vi.mock('oxc-transform', () => ({
  transform: transformMock,
}));

describe('hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isBuiltinMock.mockReturnValue(false);
  });

  it('delegates builtin and node: specifiers to nextResolve', async () => {
    const nextResolve = vi.fn().mockResolvedValue({ url: 'node:path' });
    const { resolve } = await import('./hooks');
    isBuiltinMock.mockImplementation((specifier) => specifier === 'fs');

    await expect(
      resolve(
        'fs',
        { parentURL: 'file:///C:/repo/main.ts', conditions: [], importAttributes: {} },
        nextResolve,
      ),
    ).resolves.toEqual({ url: 'node:path' });
    await expect(
      resolve(
        'node:path',
        { parentURL: 'file:///C:/repo/main.ts', conditions: [], importAttributes: {} },
        nextResolve,
      ),
    ).resolves.toEqual({ url: 'node:path' });

    expect(nextResolve).toHaveBeenCalledTimes(2);
  });

  it('returns a resolved file URL when oxc-resolver finds a path', async () => {
    resolverAsyncMock.mockResolvedValue({ path: 'C:\\repo\\src\\dep.ts' });
    const nextResolve = vi.fn();

    const { resolve } = await import('./hooks');
    const result = await resolve(
      './dep',
      { parentURL: 'file:///C:/repo/src/main.ts', conditions: [], importAttributes: {} },
      nextResolve,
    );

    expect(resolverAsyncMock).toHaveBeenCalledWith('C:\\repo\\src', './dep');
    expect(result).toEqual({
      url: 'file:///C:/repo/src/dep.ts',
      shortCircuit: true,
    });
    expect(nextResolve).not.toHaveBeenCalled();
  });

  it('falls back to nextResolve when oxc-resolver does not resolve a path', async () => {
    resolverAsyncMock.mockResolvedValue({});
    const nextResolve = vi.fn().mockResolvedValue({ url: 'file:///fallback.js' });

    const { resolve } = await import('./hooks');
    const result = await resolve(
      './dep',
      { parentURL: 'file:///C:/repo/src/main.ts', conditions: [], importAttributes: {} },
      nextResolve,
    );

    expect(result).toEqual({ url: 'file:///fallback.js' });
    expect(nextResolve).toHaveBeenCalledTimes(1);
  });

  it('delegates non-file URLs and non-TypeScript files to nextLoad', async () => {
    const nextLoad = vi.fn().mockResolvedValue({ format: 'module', source: 'export {}' });
    const { load } = await import('./hooks');

    await expect(
      load(
        'data:text/javascript,export{}',
        { conditions: [], format: 'module', importAttributes: {} },
        nextLoad,
      ),
    ).resolves.toEqual({ format: 'module', source: 'export {}' });
    await expect(
      load(
        'file:///C:/repo/file.js',
        { conditions: [], format: 'module', importAttributes: {} },
        nextLoad,
      ),
    ).resolves.toEqual({ format: 'module', source: 'export {}' });

    expect(nextLoad).toHaveBeenCalledTimes(2);
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('transforms TypeScript files through oxc-transform', async () => {
    readFileMock.mockResolvedValue('const answer: number = 42;');
    transformMock.mockResolvedValue({ code: 'const answer = 42;', errors: [] });

    const nextLoad = vi.fn();
    const { load } = await import('./hooks');
    const result = await load(
      'file:///C:/repo/file.ts',
      { conditions: [], format: 'module', importAttributes: {} },
      nextLoad,
    );

    expect(readFileMock).toHaveBeenCalledWith('C:\\repo\\file.ts', 'utf8');
    expect(transformMock).toHaveBeenCalledWith('C:\\repo\\file.ts', 'const answer: number = 42;', {
      sourcemap: true,
      sourceType: 'module',
      target: 'esnext',
      typescript: {},
    });
    expect(result).toEqual({
      format: 'module',
      source: 'const answer = 42;',
      shortCircuit: true,
    });
    expect(nextLoad).not.toHaveBeenCalled();
  });

  it('throws when oxc-transform reports errors', async () => {
    readFileMock.mockResolvedValue('const answer: number = ;');
    transformMock.mockResolvedValue({
      code: '',
      errors: [
        {
          severity: 'error',
          message: 'Unexpected token',
          labels: [],
          helpMessage: null,
          codeframe: 'file.ts:1:24\nconst answer: number = ;\n                       ^',
        },
      ],
    });

    const { load } = await import('./hooks');

    await expect(
      load(
        'file:///C:/repo/file.ts',
        { conditions: [], format: 'module', importAttributes: {} },
        vi.fn(),
      ),
    ).rejects.toThrow('file.ts:1:24');
  });

  it('falls back to an error message when oxc-transform does not provide a codeframe', async () => {
    readFileMock.mockResolvedValue('const answer: number = ;');
    transformMock.mockResolvedValue({
      code: '',
      errors: [
        {
          severity: 'error',
          message: 'Unexpected token',
          labels: [],
          helpMessage: null,
          codeframe: null,
        },
      ],
    });

    const { load } = await import('./hooks');

    await expect(
      load(
        'file:///C:/repo/file.ts',
        { conditions: [], format: 'module', importAttributes: {} },
        vi.fn(),
      ),
    ).rejects.toThrow('Unexpected token');
  });
});
