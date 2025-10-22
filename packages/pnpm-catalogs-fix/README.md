# pnpm-catalogs-fix

A `codemod` package for automatically correcting pnpm catalog references across `package.json` files and the workspace manifest.

## Overview

- Codemod packages bundle reusable workflows and transformations that run through the Codemod CLI. This package focuses on pnpm workspaces and keeps catalog-managed dependencies aligned.
- The workflow enforces `catalog:` specifiers in consumer `package.json` files and restores explicit version ranges inside `pnpm-workspace.yaml`, including named catalogs such as `catalog:dev`.
- The entry point (`dist/index.js`) detects the workspace root automatically: provide `--target <workspace>` (or set `WORKSPACE` / `WORKSPACE_DIR`) when executing the workflow from another directory.

## What it fixes

- Rewrites direct semver ranges in catalog-managed dependencies (for example, replacing `"react": "^18.0.0"` with `"react": "catalog:"`).
- Normalises workspace catalog definitions so they map to real version ranges instead of nested `catalog:` references.
- Aligns named catalogs across packages to ensure each alias resolves to the intended version.

## Quickstart

1. Build the TypeScript sources to `dist/` before running the codemod locally:
   ```bash
   pnpm build --filter pnpm-catalogs-fix
   ```
2. Validate the workflow wiring:
   ```bash
   npx codemod workflow validate --workflow packages/pnpm-catalogs-fix/workflow.yaml
   ```
3. Execute the codemod against a workspace (replace `<workspace>` with the root you want to fix):
   ```bash
   npx codemod workflow run \
     --workflow packages/pnpm-catalogs-fix/workflow.yaml \
     --target <workspace>
   ```
4. To run the published package directly from any workspace, invoke the CLI command:
   ```bash
   npx codemod pnpm/catalogs-fix
   ```

## Package layout

- `codemod.yaml` declares the package metadata, targeted files, and inclusion rules that register the `pnpm/catalogs-fix` slug.
- `workflow.yaml` defines the `fix-catalogs` node that runs `node dist/index.js`, mirroring the quickstart guidance for wiring workflows to compiled entrypoints.
- `src/` contains the TypeScript implementation, while `dist/` holds the compiled JavaScript consumed by the workflow.
- `package.json` specifies build scripts and dependencies required to ship the package.

## Further reading

- [Codemod CLI packages quickstart](https://docs.codemod.com/cli/packages/quickstart)
- [pnpm catalogs documentation](https://pnpm.io/catalogs)
