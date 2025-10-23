# pnpm Catalogs Fix

Automatically resolves broken pnpm catalog references across `pnpm-workspace.yaml` and `package.json` files. The workflow de-references nested `catalog:` values, reconciles catalog definitions, and rewrites package dependencies so every consumer points back to the catalog.

## Example

### Resolve chained catalog entries

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

### Enforce catalog usage in packages

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

## Usage

### Via Codemod CLI (Recommended)

```bash
cd your-workspace
npx codemod pnpm-catalogs-fix
```

### Direct Execution

Run TypeScript directly with Node.js 20.6+ (no build required):

```bash
cd your-workspace
node --experimental-strip-types path/to/pnpm-catalogs-fix/src/index.ts
```

Or specify workspace path:
```bash
node --experimental-strip-types path/to/pnpm-catalogs-fix/src/index.ts --workspace path/to/workspace
```

Alternatively, build and run the compiled JavaScript:

```bash
pnpm build --filter pnpm-catalogs-fix
node path/to/pnpm-catalogs-fix/dist/index.js
```

## How It Works

The codemod uses `@codemod.com/workflow` API (version 0.0.31) to:

1. **Locate workspace**: Automatically finds `pnpm-workspace.yaml` with catalog definitions
2. **Resolve catalog chains**: Recursively resolves `catalog:` references pointing to other catalogs
3. **Fix workspace catalogs**: Updates `pnpm-workspace.yaml` with resolved versions
4. **Normalize package.json**: Replaces explicit versions with `catalog:` references where appropriate
5. **Report changes**: Provides detailed output of all fixes applied

The workflow locates `pnpm-workspace.yaml`, resolves catalog chains, normalises catalog definitions, and rewrites any workspace packages to reference the catalog version.

## Technical Details

- **Runtime**: Node.js 20.6+ with native TypeScript support (`--experimental-strip-types`)
- **Language**: TypeScript (ESM)
- **Dependencies**: `@codemod.com/workflow` 0.0.31
- **Workflow Version**: codemod.com workflow schema v1

## Requirements

- Node.js 20.6+ (for native TypeScript support)
- pnpm workspace with `pnpm-workspace.yaml`
