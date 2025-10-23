# pnpm Catalogs Fix

`pnpm-catalogs-fix` 是一个 Codemod 包，用于自动修复 pnpm 工作区中 `pnpm-workspace.yaml` 与各个 `package.json` 的 catalog 引用，使工作区依赖全部回归到统一管理的 catalog 版本。

## 示例

### 解开链式 catalog 引用

**Before:**
```yaml
catalog:
  react: "catalog:legacy"
catalogs:
  legacy:
    react: "^18.2.0"
```

**After:**
```yaml
catalog:
  react: "^18.2.0"
catalogs:
  legacy:
    react: "^18.2.0"
```

### 在各 package.json 中强制回归 catalog

**Before:**
```json
{
  "name": "app-a",
  "dependencies": {
    "react": "^18.2.0"
  }
}
```

**After:**
```json
{
  "name": "app-a",
  "dependencies": {
    "react": "catalog:"
  }
}
```

## 使用方式

1. **在本地修改后重新编译 TypeScript：**
   ```bash
   pnpm build --filter pnpm-catalogs-fix
   ```
2. **在工作区根目录运行 codemod（也可使用 `--workspace <path>` 或设置 `WORKSPACE_DIR` / `WORKSPACE` 环境变量指定目标）：**
   ```bash
   npx codemod pnpm-catalogs-fix
   ```

运行时脚本会自动定位 `pnpm-workspace.yaml`，解析并整理 catalog 定义，再把各 package.json 里的依赖改写为 `catalog:` 前缀或给出需要人工确认的提示。
