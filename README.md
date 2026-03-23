# @byc/rdno

> 基于 Rolldown 的 TypeScript 执行工具

使用 Rolldown 打包和缓存的 TypeScript 运行工具。

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

- **快速**：基于 Rolldown 的高性能打包
- **智能缓存**：仅重建变化的文件
- **Source Maps**：完整调试支持
- **监听模式**：文件变化自动重启
