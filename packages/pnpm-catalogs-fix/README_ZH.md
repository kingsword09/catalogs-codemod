# pnpm-catalogs-fix

`pnpm-catalogs-fix` 是一个 `codemod` 包，可自动修复 pnpm 工作区中 `pnpm-workspace.yaml` 与各个 `package.json` 的 catalog 引用。

## 概览

- Codemod 包通过 Codemod CLI 提供可复用的工作流与转换。该包专注于 pnpm 工作区，让 catalog 管理的依赖保持一致。
- Workflow 会在 `package.json` 中强制使用 `catalog:` 前缀，并在 `pnpm-workspace.yaml` 中恢复实际的版本号（包括 `catalog:dev` 等命名 catalog）。
- 入口文件（`dist/index.js`）会自动侦测工作区根目录：如果从其他目录运行，可传入 `--target <workspace>` 或设置 `WORKSPACE` / `WORKSPACE_DIR` 环境变量。

## 可以修复的问题

- 将 catalog 管理的依赖从具体 semver 范围改写为 `catalog:` 前缀，例如把 `"react": "^18.0.0"` 修正为 `"react": "catalog:"`。
- 规范化 `pnpm-workspace.yaml` 中的 catalog 配置，使其对应真实的版本范围，而不是再引用 `catalog:`。
- 处理命名 catalog，让别名能正确映射到预期版本。

## 快速开始

1. **编译 TypeScript 源码**：
   ```bash
   pnpm build --filter pnpm-catalogs-fix
   ```
2. **校验 workflow 配置**：
   ```bash
   npx codemod workflow validate --workflow packages/pnpm-catalogs-fix/workflow.yaml
   ```
3. **在指定工作区运行 codemod**（将 `<workspace>` 替换为工作区路径）：
   ```bash
   npx codemod workflow run \
     --workflow packages/pnpm-catalogs-fix/workflow.yaml \
     --target <workspace>
   ```
4. **直接运行已发布的 Codemod 包**：
   ```bash
   npx codemod pnpm/catalogs-fix
   ```

## 包结构

- `codemod.yaml`：定义包的元信息、目标文件以及 `pnpm/catalogs-fix` 的注册信息。
- `workflow.yaml`：声明 `fix-catalogs` 节点，并通过 `node dist/index.js` 调用编译产物。
- `src/`：TypeScript 实现代码。
- `dist/`：供 workflow 使用的编译后 JavaScript。
- `package.json`：包含脚本与依赖定义。

## 延伸阅读

- [Codemod CLI Packages 快速上手](https://docs.codemod.com/cli/packages/quickstart)
- [pnpm Catalogs 官方文档](https://pnpm.io/catalogs)
