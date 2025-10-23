# pnpm-catalogs-to-bun

Migrate pnpm workspace catalogs to bun catalog format.

## Usage

```bash
# Run the migration
npx codemod pnpm-catalogs-to-bun

# Or run directly
npx pnpm-catalogs-to-bun
```

## What it does

This codemod migrates your pnpm workspace catalog configuration to bun's catalog format:

### Before (pnpm-workspace.yaml)

```yaml
packages:
  - 'packages/*'

catalog:
  react: ^19.2.0
  lodash: ^4.17.21
  typescript: ^5.3.0
```

### After (package.json)

```json
{
  "workspaces": {
    "packages": ["packages/*"],
    "catalog": {
      "lodash": "^4.17.21",
      "react": "^19.2.0",
      "typescript": "^5.3.0"
    }
  }
}
```

All workspace packages using catalog dependencies (`catalog:`) will continue to work with bun.

## Requirements

- Bun v1.1.30 or higher (for catalog support)
- Existing pnpm workspace with catalog configuration

## After migration

1. **Remove pnpm files** (optional):
   ```bash
   rm pnpm-workspace.yaml pnpm-lock.yaml
   ```

2. **Install dependencies with bun**:
   ```bash
   bun install
   ```

3. **Verify**:
   ```bash
   bun pm ls
   ```

## Features

- ✅ Migrates catalog from `pnpm-workspace.yaml` to root `package.json`
- ✅ Preserves `catalog:` references in workspace packages
- ✅ Merges named catalogs (if any) into single catalog
- ✅ Sorts catalog entries alphabetically
- ✅ Adds workspaces configuration if missing

## Notes

- Bun's catalog feature is equivalent to pnpm's catalog
- Named catalogs (pnpm's `catalogs:`) are merged into one catalog
- The codemod preserves all existing `catalog:` references

## License

Apache-2.0
