# RDNO ![beta](https://img.shields.io/badge/status-beta-yellow)

> 基于 OXC 的 TypeScript 执行工具
>
> **⚠️ Beta 版本** - 功能仍在开发中，API 可能发生变化。

使用原生 ESM Loader 模式的 TypeScript 运行工具，集成 oxc-transform 和 oxc-resolver。

## 安装

```bash
pnpm add -g @byc/rdno
```

## 使用

运行 TypeScript 文件：

```bash
rdno src/main.ts
```

监听模式（文件变化自动重启）：

```bash
rdno src/main.ts --watch
```

## 配置

在项目根目录创建 `rdno.config.ts` 文件来自定义转译和解析选项：

```ts
import { defineConfig } from '@byc/rdno/config';

export default defineConfig({
  transform: {
    target: 'es2020',
    jsx: {
      runtime: 'automatic',
      importSource: 'preact',
    },
  },
  resolver: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@': './src',
    },
  },
});
```

支持的配置文件格式：

- `rdno.config.{ts,js,mjs,mts,cjs,cts}`

### 配置选项

| 选项        | 类型                 | 默认值 | 说明         |
| ----------- | -------------------- | ------ | ------------ |
| `transform` | `TransformOptions`   | 见下方 | OXC 转译选项 |
| `resolver`  | `NapiResolveOptions` | 见下方 | OXC 解析选项 |

#### 默认 transform 选项

```ts
{
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
    development: process.env.NODE_ENV !== 'production',
    pure: true,
  },
  decorator: {
    legacy: true,
    emitDecoratorMetadata: true,
  },
  define: {
    'process.env.NODE_ENV': process.env.NODE_ENV !== 'production' ? '"development"' : '"production"',
    __DEV__: String(process.env.NODE_ENV !== 'production'),
    __PROD__: String(process.env.NODE_ENV === 'production'),
  },
}
```

#### 默认 resolver 选项

```ts
{
  tsconfig: 'auto',
  extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.mts', '.cjs', '.cts', '.es6', 'es'],
  conditionNames: ['import', 'node', 'development', 'dev'],
  mainFields: ['source', 'module', 'main'],
  exportsFields: ['exports'],
  modules: ['node_modules'],
  symlinks: true,
}
```

## 特性

- **快速**：基于 OXC 的高性能转译和解析
- **原生 ESM**：使用原生 ESM Loader 模式
- **Source Maps**：完整调试支持
- **监听模式**：文件变化自动重启
- **可配置**：支持自定义转译和解析选项
