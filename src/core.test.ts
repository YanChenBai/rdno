import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const accessMock = vi.fn();
const spawnMock = vi.fn();
const subscribeMock = vi.fn();

vi.mock('fs', () => ({
  promises: {
    access: accessMock,
  },
}));

vi.mock('child_process', () => ({
  spawn: spawnMock,
}));

vi.mock('@parcel/watcher', () => ({
  default: {
    subscribe: subscribeMock,
  },
}));

describe('core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete process.env.NODE_PATH;
  });

  it('spawns node with the register loader and node_modules on NODE_PATH', async () => {
    accessMock.mockResolvedValue(undefined);

    const child = { on: vi.fn(), kill: vi.fn() };
    spawnMock.mockReturnValue(child);

    const cwd = 'C:\\repo';
    vi.stubGlobal('process', {
      ...process,
      cwd: vi.fn(() => cwd),
      env: { ...process.env },
    });

    const { run } = await import('./core');
    const result = await run('src/main.ts');

    expect(result).toBe(child);
    expect(accessMock).toHaveBeenCalledWith('C:\\repo\\node_modules');
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock).toHaveBeenCalledWith(
      'node',
      ['--import', expect.stringContaining('/register.mjs'), 'src/main.ts'],
      expect.objectContaining({
        cwd,
        stdio: 'inherit',
        env: expect.objectContaining({
          NODE_PATH: 'C:\\repo\\node_modules',
          NODE_OPTIONS: '--enable-source-maps',
        }),
      }),
    );
  });

  it('preserves existing NODE_PATH when local node_modules is missing', async () => {
    accessMock.mockRejectedValue(new Error('missing'));

    const child = { on: vi.fn(), kill: vi.fn() };
    spawnMock.mockReturnValue(child);

    const cwd = 'C:\\repo';
    vi.stubGlobal('process', {
      ...process,
      cwd: vi.fn(() => cwd),
      env: { ...process.env, NODE_PATH: 'C:\\shared' },
    });

    const { run } = await import('./core');
    await run('src/main.ts');

    expect(spawnMock).toHaveBeenCalledWith(
      'node',
      ['--import', expect.any(String), 'src/main.ts'],
      expect.objectContaining({
        env: expect.objectContaining({
          NODE_PATH: 'C:\\shared',
        }),
      }),
    );
  });

  it('restarts the child on successful watch events and skips restart on errors', async () => {
    accessMock.mockResolvedValue(undefined);

    const firstChild = { on: vi.fn(), kill: vi.fn() };
    const secondChild = { on: vi.fn(), kill: vi.fn() };
    spawnMock.mockReturnValueOnce(firstChild).mockReturnValueOnce(secondChild);

    let callback: ((error?: Error | null) => Promise<void>) | undefined;
    subscribeMock.mockImplementation(async (_cwd, eventHandler, options) => {
      callback = eventHandler;
      return { unsubscribe: vi.fn(), options };
    });

    const cwd = 'C:\\repo';
    vi.stubGlobal('process', {
      ...process,
      cwd: vi.fn(() => cwd),
      env: { ...process.env },
    });

    const { watch } = await import('./core');
    const subscription = await watch('src/main.ts');

    expect(subscribeMock).toHaveBeenCalledWith(
      cwd,
      expect.any(Function),
      expect.objectContaining({
        ignore: expect.arrayContaining(['node_modules', 'coverage', '*.snap']),
      }),
    );
    expect(subscription).toEqual(
      expect.objectContaining({
        unsubscribe: expect.any(Function),
      }),
    );

    await callback?.(null);
    expect(firstChild.kill).toHaveBeenCalledWith('SIGTERM');
    expect(spawnMock).toHaveBeenCalledTimes(2);

    await callback?.(new Error('change failure'));
    expect(secondChild.kill).toHaveBeenCalledWith('SIGTERM');
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });
});
