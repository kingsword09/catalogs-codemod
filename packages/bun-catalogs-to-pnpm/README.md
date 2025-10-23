# bun-catalogs-to-pnpm

Migrate bun catalog to pnpm workspace catalogs format.

## Usage

```bash
# Run the migration
npx codemod bun-catalogs-to-pnpm

# Or run directly
npx bun-catalogs-to-pnpm
```

## What it does

This codemod migrates your bun catalog configuration back to pnpm's workspace catalog format:

### Before (package.json)

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

### After (pnpm-workspace.yaml)

```yaml
packages:
  - 'packages/*'

catalog:
  lodash: ^4.17.21
  react: ^19.2.0
  typescript: ^5.3.0
```

The catalog is removed from `package.json` and moved to `pnpm-workspace.yaml`.

All workspace packages using catalog dependencies (`catalog:`) will continue to work with pnpm.

## Requirements

- pnpm v9.5.0 or higher (for catalog support)
- Existing bun workspace with catalog configuration in package.json

## After migration

1. **Remove bun files** (optional):
   ```bash
   rm bun.lockb
   ```

2. **Install dependencies with pnpm**:
   ```bash
   pnpm install
   ```

3. **Verify**:
   ```bash
   cat pnpm-workspace.yaml
   ```

## Features

- ✅ Migrates catalog from root `package.json` to `pnpm-workspace.yaml`
- ✅ Preserves `catalog:` references in workspace packages
- ✅ Creates `pnpm-workspace.yaml` if it doesn't exist
- ✅ Updates existing `pnpm-workspace.yaml` if present
- ✅ Removes catalog from root `package.json`

## Notes

- This is the reverse operation of `pnpm-catalogs-to-bun`
- All `catalog:` references in workspace packages remain unchanged
- The codemod creates or updates `pnpm-workspace.yaml` automatically

## License

Apache-2.0
