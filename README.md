# @byc/rdno

> 基于 OXC 的 TypeScript 执行工具

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

## 特性

- **快速**：基于 OXC 的高性能转译和解析
- **原生 ESM**：使用原生 ESM Loader 模式
- **Source Maps**：完整调试支持
- **监听模式**：文件变化自动重启
