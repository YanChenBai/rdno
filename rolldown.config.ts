import path from 'node:path';

import { defineConfig } from 'rolldown';

export default defineConfig({
  tsconfig: true,
  platform: 'node',
  input: 'src/index.ts',
  treeshake: false,
  output: {
    dir: 'bin',
    format: 'esm',
  },

  external: (id) => !id.startsWith('.') && !id.startsWith('/') && !path.isAbsolute(id),
});
