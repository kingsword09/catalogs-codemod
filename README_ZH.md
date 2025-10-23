# Catalogs Codemod（目录修复工具集）

本仓库收录了一组基于 Codemod CLI 的工具，用于修复 pnpm 项目中常见的 catalog 配置问题。目前提供的包为 `pnpm-catalogs-fix`，并附带一个可用于端到端验证的示例工作区。

## 仓库结构

```
catalogs-codemod/
├── packages/
│   └── pnpm-catalogs-fix/   # 修复 pnpm catalog 配置的 codemod 包
├── test-workspace/          # 用于手动测试的示例 pnpm 工作区
├── pnpm-workspace.yaml
└── README_ZH.md
```

## pnpm-catalogs-fix 概览

`pnpm-catalogs-fix` 会扫描 pnpm 工作区，规范化 `pnpm-workspace.yaml`，并改写各个 `package.json`，让属于 catalog 的依赖全部使用正确的 `catalog:` 前缀。

workflow 会自动推断工作区根目录：
- 如果在仓库外部运行，请使用 `--target <workspace>`（或设置 `WORKSPACE` / `WORKSPACE_DIR` 环境变量）。
- 如果从目标工作区根目录执行，则无需额外参数。

## 快速开始

1. **安装依赖**（首次执行即可）：
   ```bash
   pnpm install
   ```
2. **构建 codemod 包**：
   ```bash
   pnpm build --filter pnpm-catalogs-fix
   ```
3. **对某个工作区运行 workflow**：
   ```bash
   # 在仓库根目录下执行
   npx codemod workflow run \
     --workflow packages/pnpm-catalogs-fix/workflow.yaml \
     --target /path/to/your/workspace
   ```
   运行结束后，请在目标工作区里执行 `pnpm install` 以更新锁文件。

## 开发说明

- TypeScript 源码位于 `packages/pnpm-catalogs-fix/src`。
- 构建产物输出到 `packages/pnpm-catalogs-fix/dist`。
- `packages/pnpm-catalogs-fix/workflow.yaml` 将编译后的入口（`dist/index.js`）接入 workflow。
- 常用脚本：
  - `pnpm build --filter pnpm-catalogs-fix` – 编译 TypeScript 源码。
  - （若添加）`pnpm --filter pnpm-catalogs-fix lint` – 运行代码检查。

## 示例工作区

`test-workspace/` 目录模拟了一个小型 pnpm Monorepo：

- `packages/app-a` 混用了直接版本与 `catalog:` 引用，供 codemod 修复。
- `packages/app-b` 已正确使用 `catalog:` 前缀，供比对参考。

可以通过 `--target test-workspace` 运行 workflow，观察 codemod 如何更新工作区清单和各个包的依赖。

## 参考资料

- [pnpm Catalogs 文档](https://pnpm.io/catalogs)
- [Codemod CLI Packages 快速上手](https://docs.codemod.com/cli/packages/quickstart)

## 许可证

MIT
