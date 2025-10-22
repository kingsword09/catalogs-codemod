# Catalogs Codemod

A collection of Codemod CLI packages that repair common mistakes in pnpm catalog configurations. The repository currently ships the `pnpm-catalogs-fix` package together with a sample workspace you can use to test the workflow end to end.

## Repository layout

```
catalogs-codemod/
├── packages/
│   └── pnpm-catalogs-fix/   # Codemod package that fixes pnpm catalog usage
├── test-workspace/          # Disposable pnpm workspace used for manual testing
├── pnpm-workspace.yaml
└── README.md
```

## pnpm-catalogs-fix in a nutshell

`pnpm-catalogs-fix` is built with `@codemod.com/workflow`. The workflow scans a pnpm workspace, normalises `pnpm-workspace.yaml`, and rewrites `package.json` files so every dependency that belongs to a catalog uses the right `catalog:` specifier.

It automatically resolves the workspace root. When you run the workflow from another folder, pass `--target <workspace>` (or set `WORKSPACE` / `WORKSPACE_DIR`); when you run it inside the workspace root, no extra flag is required.

## Quick start

1. **Install dependencies** (once per checkout):
   ```bash
   pnpm install
   ```
2. **Build the codemod package**:
   ```bash
   pnpm build --filter pnpm-catalogs-fix
   ```
3. **Run the workflow against a workspace**:
   ```bash
   # From the repository root
   npx codemod workflow run \
     --workflow packages/pnpm-catalogs-fix/workflow.yaml \
     --target /path/to/your/workspace
   ```
   When the command finishes, run `pnpm install` inside the workspace to refresh the lockfile.

## Developing the codemod

- The TypeScript sources live in `packages/pnpm-catalogs-fix/src`.
- Compiled JavaScript is emitted into `packages/pnpm-catalogs-fix/dist`.
- `packages/pnpm-catalogs-fix/workflow.yaml` wires the compiled entry point (`dist/index.js`) into a workflow node.
- `pnpm` scripts:
  - `pnpm build --filter pnpm-catalogs-fix` – compile TypeScript sources.
  - `pnpm --filter pnpm-catalogs-fix lint` (if added) – run linting.

## Test workspace

The `test-workspace/` directory mimics a small pnpm monorepo:

- `packages/app-a` intentionally mixes direct versions with catalog references.
- `packages/app-b` uses `catalog:` specifiers that should remain intact.

Run the workflow with `--target test-workspace` to watch the codemod update both the workspace manifest and package manifests.

## References

- [pnpm catalogs documentation](https://pnpm.io/catalogs)
- [Codemod CLI packages quickstart](https://docs.codemod.com/cli/packages/quickstart)
- [@codemod.com/workflow API](https://docs.codemod.com/cli/workflow-api)

## License

MIT
