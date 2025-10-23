# Catalogs Codemod（目录修复工具集）

一组用于处理 pnpm 和 bun catalog 配置的 codemod 工具包。

## 包列表

本仓库包含三个 codemod 包：

- **[pnpm-catalogs-fix](packages/pnpm-catalogs-fix)** - 修复错误的 pnpm catalog 配置
- **[pnpm-catalogs-to-bun](packages/pnpm-catalogs-to-bun)** - 将 pnpm workspace catalogs 迁移到 bun 格式
- **[bun-catalogs-to-pnpm](packages/bun-catalogs-to-pnpm)** - 将 bun catalog 迁移到 pnpm workspace 格式

## 仓库结构

```
catalogs-codemod/
├── packages/
│   ├── pnpm-catalogs-fix/      # 修复 pnpm catalog 配置
│   ├── pnpm-catalogs-to-bun/   # pnpm → bun 迁移
│   └── bun-catalogs-to-pnpm/   # bun → pnpm 迁移
├── test-workspace/             # 用于手动测试的测试工作区
├── pnpm-workspace.yaml
└── README_ZH.md
```

## 概览

### pnpm-catalogs-fix

扫描 pnpm 工作区并修复常见的 catalog 配置错误：
- 检测错误的 `catalog:` vs `catalog:*` 引用
- 识别版本冲突
- 报告并建议修复方案

### pnpm-catalogs-to-bun

将 pnpm workspace catalogs 迁移到 bun 格式：

**迁移前** (pnpm-workspace.yaml):
```yaml
packages:
  - packages/*
catalog:
  react: ^19.0.0
```

**迁移后** (package.json):
```json
{
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": {
      "react": "^19.0.0"
    }
  }
}
```

### bun-catalogs-to-pnpm

将 bun catalog 迁移回 pnpm workspace 格式（上述操作的反向）。

## 快速开始

### 使用已发布的包（推荐）

```bash
# 修复 pnpm catalog 配置
npx codemod pnpm-catalogs-fix
# 或
npx pnpm-catalogs-fix

# 从 pnpm 迁移到 bun
npx codemod pnpm-catalogs-to-bun
# 或
npx pnpm-catalogs-to-bun

# 从 bun 迁移到 pnpm
npx codemod bun-catalogs-to-pnpm
# 或
npx bun-catalogs-to-pnpm
```

### 开发

1. **安装依赖**：
   ```bash
   pnpm install
   ```

2. **构建特定包**：
   ```bash
   pnpm build --filter pnpm-catalogs-fix
   # 或
   pnpm build --filter pnpm-catalogs-to-bun
   # 或
   pnpm build --filter bun-catalogs-to-pnpm
   ```

3. **本地测试**：
   ```bash
   cd test-workspace
   node ../packages/pnpm-catalogs-fix/dist/index.js
   ```

## 包结构

每个 codemod 包遵循相同的结构：

```
packages/<package-name>/
├── scripts/
│   └── index.ts          # TypeScript 源码，包含 workflow 函数
├── dist/
│   └── index.js          # 编译后的可执行文件
├── codemod.yaml          # Codemod registry 元数据
├── workflow.yaml         # Workflow 定义
├── package.json          # 包配置，含 bin 入口
├── tsconfig.json         # TypeScript 配置
└── README.md            # 包文档
```

### 主要特性

- **可执行 bin**：每个包通过 `bin` 字段导出 CLI 命令
- **Workflow API**：使用 `@codemod.com/workflow` 进行跨文件协调
- **TypeScript**：用 TypeScript 编写，编译为 CommonJS
- **已发布**：可在 npm 和 Codemod Registry 上使用

## 示例工作区

`test-workspace/` 目录模拟了一个小型 pnpm Monorepo：

- `packages/app-a` 混用了直接版本与 `catalog:` 引用，供 codemod 修复。
- `packages/app-b` 已正确使用 `catalog:` 前缀，供比对参考。

可以通过 `--target test-workspace` 运行 workflow，观察 codemod 如何更新工作区清单和各个包的依赖。

## 重要：Bun catalog 格式

Bun 的 catalog 配置使用 **workspaces 对象**格式：

```json
{
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": {
      "react": "^19.0.0",
      "react-dom": "^19.0.0"
    },
    "catalogs": {
      "build": {
        "webpack": "5.88.2"
      }
    }
  }
}
```

关键点：
- `workspaces` 是一个**对象**，不是数组
- `catalog` 和 `catalogs` 位于 `workspaces` 对象**内部**
- 通过 `catalogs` 字段支持命名 catalog

## 发布

```bash
# 发布到 npm
cd packages/<package-name>
npm publish --access public

# 发布到 Codemod Registry
npx codemod publish
```

## 参考资料

- [pnpm Catalogs 文档](https://pnpm.io/catalogs)
- [Bun Workspaces 文档](https://bun.sh/docs/install/workspaces)
- [Codemod CLI Packages 快速上手](https://docs.codemod.com/cli/packages/quickstart)

## 许可证

Apache-2.0
