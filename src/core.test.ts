import { promises as fs } from 'fs';
import path from 'path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { resolveCachePath } from './core';

describe('resolveCachePath', () => {
  const cwd = '/vfs/project';
  const entry = '/vfs/project/src/index.ts';
  const format = 'esm';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('相同输入应产生相同的 Hash', async () => {
    // mock fs.stat
    vi.spyOn(fs, 'stat').mockResolvedValue({ mtimeMs: 1000 } as any);

    const path1 = await resolveCachePath({ entry, cwd, format });
    const path2 = await resolveCachePath({ entry, cwd, format });

    expect(path1).toBe(path2);
    expect(path1).toContain('src_index_ts'); // 验证文件名扁平化
  });

  it('文件修改时间 (mtime) 变化后, Hash 必须改变', async () => {
    const spy = vi.spyOn(fs, 'stat');

    spy.mockResolvedValueOnce({ mtimeMs: 1000 } as any);
    const path1 = await resolveCachePath({ entry, cwd, format });

    spy.mockResolvedValueOnce({ mtimeMs: 2000 } as any);
    const path2 = await resolveCachePath({ entry, cwd, format });

    expect(path1).not.toBe(path2);
  });

  it('不同编译格式 (format) 应产生不同 Hash', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue({ mtimeMs: 1000 } as any);

    const esmPath = await resolveCachePath({ entry, cwd, format: 'esm' });
    const cjsPath = await resolveCachePath({ entry, cwd, format: 'cjs' });

    expect(esmPath).not.toBe(cjsPath);
  });

  it('能够处理相对路径输入', async () => {
    vi.spyOn(fs, 'stat').mockResolvedValue({ mtimeMs: 1000 } as any);

    // 传入相对路径
    const entry = 'src/index.ts';
    const result = await resolveCachePath({ entry, cwd, format });

    expect(result).toContain('src_index_ts');
    expect(path.isAbsolute(result)).toBe(true);
  });
});
