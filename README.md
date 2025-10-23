# Catalogs Codemod

A collection of codemod packages for working with pnpm and bun catalog configurations.

## Packages

This repository contains three codemod packages:

- **[pnpm-catalogs-fix](https://app.codemod.com/registry/pnpm-catalogs-fix)** - Fix incorrect pnpm catalog configurations
- **[pnpm-catalogs-to-bun](https://app.codemod.com/registry/pnpm-catalogs-to-bun)** - Migrate pnpm workspace catalogs to bun format
- **[bun-catalogs-to-pnpm](https://app.codemod.com/registry/bun-catalogs-to-pnpm)** - Migrate bun catalog to pnpm workspace format

## Repository layout

```
catalogs-codemod/
├── packages/
│   ├── pnpm-catalogs-fix/      # Fix pnpm catalog configurations
│   ├── pnpm-catalogs-to-bun/   # Migrate pnpm → bun
│   └── bun-catalogs-to-pnpm/   # Migrate bun → pnpm
├── test-workspace/             # Test workspace for manual testing
├── pnpm-workspace.yaml
└── README.md
```

## Overview

### pnpm-catalogs-fix

Scans a pnpm workspace and fixes common catalog configuration mistakes:
- Detects incorrect `catalog:` vs `catalog:*` references
- Identifies version conflicts
- Reports and suggests fixes

### pnpm-catalogs-to-bun

Migrates pnpm workspace catalogs to bun format:

**Before** (pnpm-workspace.yaml):
```yaml
packages:
  - packages/*
catalog:
  react: ^19.0.0
```

**After** (package.json):
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

Migrates bun catalog back to pnpm workspace format (reverse of above).

## Quick start

### Using published packages (recommended)

```bash
# Fix pnpm catalog configurations
npx codemod pnpm-catalogs-fix
# or
npx pnpm-catalogs-fix

# Migrate from pnpm to bun
npx codemod pnpm-catalogs-to-bun
# or
npx pnpm-catalogs-to-bun

# Migrate from bun to pnpm
npx codemod bun-catalogs-to-pnpm
# or
npx bun-catalogs-to-pnpm
```

### Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build a specific package**:
   ```bash
   pnpm build --filter pnpm-catalogs-fix
   # or
   pnpm build --filter pnpm-catalogs-to-bun
   # or
   pnpm build --filter bun-catalogs-to-pnpm
   ```

3. **Test locally**:
   ```bash
   cd test-workspace
   node ../packages/pnpm-catalogs-fix/dist/index.js
   ```

## Package structure

Each codemod package follows the same structure:

```
packages/<package-name>/
├── scripts/
│   └── index.ts          # TypeScript source with workflow function
├── dist/
│   └── index.js          # Compiled executable
├── codemod.yaml          # Codemod registry metadata
├── workflow.yaml         # Workflow definition
├── package.json          # Package config with bin entry
├── tsconfig.json         # TypeScript config
└── README.md            # Package documentation
```

### Key features

- **Executable bins**: Each package exports a CLI command via `bin` field
- **Workflow API**: Uses `@codemod.com/workflow` for cross-file coordination
- **TypeScript**: Written in TypeScript, compiled to CommonJS
- **Published**: Available on npm and Codemod Registry

## Test workspace

The `test-workspace/` directory mimics a small pnpm monorepo:

- `packages/app-a` intentionally mixes direct versions with catalog references.
- `packages/app-b` uses `catalog:` specifiers that should remain intact.

Run the workflow with `--target test-workspace` to watch the codemod update both the workspace manifest and package manifests.

## Important: Bun catalog format

Bun's catalog configuration uses a **workspaces object** format:

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

Key points:
- `workspaces` is an **object**, not an array
- `catalog` and `catalogs` are **inside** the `workspaces` object
- Supports named catalogs via `catalogs` field

## Publishing

```bash
# Publish to npm
cd packages/<package-name>
npm publish --access public

# Publish to Codemod Registry
npx codemod publish
```

## References

- [pnpm catalogs documentation](https://pnpm.io/catalogs)
- [Bun workspaces documentation](https://bun.sh/docs/install/workspaces)
- [Codemod CLI packages quickstart](https://docs.codemod.com/cli/packages/quickstart)

## License

Apache-2.0
