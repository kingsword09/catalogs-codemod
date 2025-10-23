#!/usr/bin/env node

import { api, type Api } from "@codemod.com/workflow";
import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import process from "node:process";

const initialCwd = process.cwd();

type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type WorkspaceYaml = {
  packages?: string[];
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
};

/**
 * Check if a version is a catalog reference
 */
const parseCatalogReference = (version: string): { name: string; isValid: boolean } | null => {
  const catalogMatch = version.match(/^catalog:(.*)$/);
  if (!catalogMatch) {
    return null;
  }
  const catalogName = catalogMatch[1] || 'default';
  const isValid = catalogMatch[1] !== '' || version === 'catalog:';
  return { name: catalogName, isValid };
};

/**
 * Check if a version string looks like a version range (not catalog reference)
 */
const isVersionRange = (version: string): boolean => {
  const versionPatterns = [
    /^\^/,           // ^1.0.0
    /^~/,            // ~1.0.0
    /^>=?/,          // >=1.0.0, >1.0.0
    /^<=?/,          // <=1.0.0, <1.0.0
    /^\d/,           // 1.0.0
    /^\*/,           // *
    /^latest$/,      // latest
    /^workspace:/,   // workspace:*
  ];
  return versionPatterns.some(pattern => pattern.test(version)) && !version.startsWith('catalog:');
};

/**
 * Main workflow to fix catalog configurations
 * This codemod fixes incorrect pnpm catalog references in workspace
 */
export async function workflow({ files, dirs }: Api) {
  console.log('🔍 Scanning workspace for catalog configuration issues...\n');

  const preferredWorkspace = extractWorkspaceArgument()
    ?? process.env.WORKSPACE_DIR
    ?? process.env.WORKSPACE
    ?? null;

  const workspaceDir = await findWorkspaceDirectory(preferredWorkspace);

  if (!workspaceDir) {
    console.log('⚠️  No catalogs defined in pnpm-workspace.yaml');
    return;
  }

  if (workspaceDir !== process.cwd()) {
    process.chdir(workspaceDir);
    console.log(`📂 Using workspace: ${workspaceDir}\n`);
  }

  // Read workspace yaml
  const workspaceFile = files("pnpm-workspace.yaml").yaml();
  const workspaceConfig = (
    await workspaceFile.map(({ getContents }) => getContents<WorkspaceYaml>())
  ).pop();

  if (!workspaceConfig) {
    console.log('❌ pnpm-workspace.yaml not found');
    return;
  }

  if (!workspaceConfig.catalog && !workspaceConfig.catalogs) {
    console.log('⚠️  No catalogs defined in pnpm-workspace.yaml');
    return;
  }

  const packageGlobs = [...(workspaceConfig.packages || []), './'];
  const packageVersionCandidates = new Map<string, Map<string, number>>();

  // Gather version ranges from package.json files before mutating
  await dirs({
    dirs: packageGlobs,
    ignore: ["**/node_modules/**"],
  })
    .files("package.json")
    .json()
    .map(async ({ getContents }) => {
      const packageJson = await getContents<PackageJson>();
      const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

      for (const field of depFields) {
        const deps = packageJson[field];
        if (!deps) continue;

        for (const [depName, version] of Object.entries(deps)) {
          if (isVersionRange(version)) {
            if (!packageVersionCandidates.has(depName)) {
              packageVersionCandidates.set(depName, new Map());
            }
            const versions = packageVersionCandidates.get(depName)!;
            versions.set(version, (versions.get(version) || 0) + 1);
          }
        }
      }
    });

  const resolveCandidateVersion = (depName: string): string | null => {
    const versions = packageVersionCandidates.get(depName);
    if (!versions) {
      return null;
    }
    let chosenVersion: string | null = null;
    let maxCount = -1;
    for (const [version, count] of versions.entries()) {
      if (count > maxCount) {
        maxCount = count;
        chosenVersion = version;
      }
    }
    return chosenVersion;
  };

  const getCatalogStore = (catalogName: string) => {
    if (catalogName === 'default') {
      workspaceConfig.catalog = workspaceConfig.catalog || {};
      return workspaceConfig.catalog;
    }

    workspaceConfig.catalogs = workspaceConfig.catalogs || {};
    workspaceConfig.catalogs[catalogName] = workspaceConfig.catalogs[catalogName] || {};
    return workspaceConfig.catalogs[catalogName]!;
  };

  const getCatalogValue = (catalogName: string, depName: string): string | undefined => {
    if (catalogName === 'default') {
      return workspaceConfig.catalog?.[depName];
    }
    return workspaceConfig.catalogs?.[catalogName]?.[depName];
  };

  const resolveCatalogVersionFromWorkspace = (
    sourceCatalog: string,
    depName: string,
    visited: Set<string>
  ): string | null => {
    const key = `${sourceCatalog}:${depName}`;
    if (visited.has(key)) {
      return null;
    }
    visited.add(key);

    const current = getCatalogValue(sourceCatalog, depName);
    if (!current) {
      return null;
    }

    const catalogRef = parseCatalogReference(current);
    if (!catalogRef) {
      return current;
    }

    if (!catalogRef.isValid) {
      return null;
    }

    if (catalogRef.name === sourceCatalog) {
      return null;
    }

    return resolveCatalogVersionFromWorkspace(catalogRef.name, depName, visited);
  };

  // Fix workspace yaml by resolving catalog references
  console.log('📋 Checking pnpm-workspace.yaml...\n');

  let workspaceChanged = false;
  const workspaceFixes: string[] = [];

  const entries: Array<{ catalogName: string; depName: string }> = [];

  if (workspaceConfig.catalog) {
    for (const pkgName of Object.keys(workspaceConfig.catalog)) {
      entries.push({ catalogName: 'default', depName: pkgName });
    }
  }

  if (workspaceConfig.catalogs) {
    for (const [catalogName, catalogDeps] of Object.entries(workspaceConfig.catalogs)) {
      for (const pkgName of Object.keys(catalogDeps)) {
        entries.push({ catalogName, depName: pkgName });
      }
    }
  }

  let progress = true;
  while (progress) {
    progress = false;
    for (const { catalogName, depName } of entries) {
      const currentValue = getCatalogValue(catalogName, depName);
      if (!currentValue) {
        continue;
      }

      const catalogRef = parseCatalogReference(currentValue);
      if (!catalogRef || !catalogRef.isValid) {
        continue;
      }

      const resolved = resolveCatalogVersionFromWorkspace(catalogRef.name, depName, new Set());
      let finalVersion = resolved;

      if (!finalVersion && catalogRef.name === 'default') {
        finalVersion = resolveCandidateVersion(depName);
      }

      if (finalVersion && !parseCatalogReference(finalVersion)) {
        const store = getCatalogStore(catalogName);
        store[depName] = finalVersion;
        workspaceFixes.push(
          `  ✅ ${catalogName === 'default' ? 'catalog' : `catalogs.${catalogName}`}.${depName}: "${currentValue}" → "${finalVersion}"`
        );
        workspaceChanged = true;
        progress = true;
      }
    }
  }

  const workspaceWarnings: string[] = [];
  for (const { catalogName, depName } of entries) {
    const currentValue = getCatalogValue(catalogName, depName);
    if (!currentValue) {
      continue;
    }

    const catalogRef = parseCatalogReference(currentValue);
    if (!catalogRef) {
      continue;
    }

    const prefix = catalogName === 'default' ? 'catalog' : `catalogs.${catalogName}`;
    if (!catalogRef.isValid) {
      workspaceWarnings.push(
        `  ❌ ${prefix}.${depName}: "${currentValue}" (invalid catalog reference)`
      );
      continue;
    }

    workspaceWarnings.push(
      `  ⚠️  ${prefix}.${depName}: "${currentValue}" could not be resolved`
    );
  }

  if (workspaceFixes.length > 0) {
    for (const fix of workspaceFixes) {
      console.log(fix);
    }
  }

  if (workspaceWarnings.length > 0) {
    for (const warning of workspaceWarnings) {
      console.log(warning);
    }
  }

  if (workspaceFixes.length === 0 && workspaceWarnings.length === 0) {
    console.log('  ✅ pnpm-workspace.yaml looks good\n');
  } else {
    console.log();
  }

  if (workspaceChanged) {
    await workspaceFile.update(() => workspaceConfig);
  }

  // Rebuild catalogs after workspace fixes
  const catalogs = new Map<string, Map<string, string>>();

  if (workspaceConfig.catalog) {
    catalogs.set('default', new Map(Object.entries(workspaceConfig.catalog)));
  }

  if (workspaceConfig.catalogs) {
    for (const [catalogName, catalogDeps] of Object.entries(workspaceConfig.catalogs)) {
      catalogs.set(catalogName, new Map(Object.entries(catalogDeps)));
    }
  }

  let packageFixCount = 0;
  let totalChanges = 0;

  // Process package.json files
  console.log('📦 Checking package.json files...\n');

  const packageJsonFiles = dirs({
    dirs: packageGlobs,
    ignore: ["**/node_modules/**"],
  }).files("package.json");

  await packageJsonFiles.json().update<PackageJson>((packageJson) => {
    let fileChanged = false;
    const changes: string[] = [];

    const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;

    for (const field of depFields) {
      if (!packageJson[field]) continue;

      for (const [depName, version] of Object.entries(packageJson[field]!)) {
        const catalogRef = parseCatalogReference(version);

        // Check for invalid catalog references
        if (catalogRef && !catalogRef.isValid) {
          changes.push(`  ❌ ${field}.${depName}: "${version}" (invalid format)`);
          continue;
        }

        // Check if should use catalog but doesn't
        if (!catalogRef && isVersionRange(version)) {
          // Check if this package exists in any catalog
          for (const [catalogName, catalog] of catalogs.entries()) {
            const catalogVersion = catalog.get(depName);
            if (catalogVersion && catalogVersion === version) {
              const newVersion = catalogName === 'default' ? 'catalog:' : `catalog:${catalogName}`;
              changes.push(`  ✅ ${field}.${depName}: "${version}" → "${newVersion}"`);
              packageJson[field]![depName] = newVersion;
              fileChanged = true;
              totalChanges++;
              break;
            }
          }
        }

        // Check if catalog reference exists
        if (catalogRef && catalogRef.isValid) {
          const catalog = catalogs.get(catalogRef.name);
          if (!catalog || !catalog.has(depName)) {
            changes.push(`  ⚠️  ${field}.${depName}: references catalog:${catalogRef.name} but not defined in workspace`);
          }
        }
      }
    }

    if (changes.length > 0) {
      console.log(`  ${packageJson.name || 'root'}:`);
      for (const change of changes) {
        console.log(change);
      }
      console.log();
      if (fileChanged) {
        packageFixCount++;
      }
    }

    return packageJson;
  });

  // Summary
  console.log('📊 Summary:\n');
  
  if (workspaceWarnings.length > 0) {
    const unresolvedCount = workspaceWarnings.filter((message) => message.includes('could not be resolved') || message.includes('invalid catalog reference')).length;
    if (unresolvedCount > 0) {
      console.log(`  ⚠️  ${unresolvedCount} item(s) in pnpm-workspace.yaml need manual review`);
    }
  }

  if (totalChanges > 0) {
    console.log(`  ✅ Fixed ${totalChanges} dependency reference(s) in ${packageFixCount} package(s)`);
    console.log('\n💡 Tip: Run "pnpm install" to update your lock file');
  } else if (workspaceWarnings.length === 0) {
    console.log('  ✨ All catalog configurations look good!');
  } else {
    console.log('  ℹ️  No package.json files needed fixing');
  }
}

function extractWorkspaceArgument(): string | null {
  for (let index = 2; index < process.argv.length; index++) {
    const arg = process.argv[index];
    if (arg === '--workspace') {
      return process.argv[index + 1] ?? null;
    }
    if (arg.startsWith('--workspace=')) {
      return arg.slice('--workspace='.length);
    }
  }
  return null;
}

async function findWorkspaceDirectory(preferred: string | null): Promise<string | null> {
  const candidates: string[] = [];
  if (preferred && preferred.trim() && !preferred.includes('{{')) {
    candidates.push(preferred);
  }
  candidates.push(initialCwd);

  for (const candidate of candidates) {
    const absoluteCandidate = isAbsolute(candidate)
      ? candidate
      : resolve(initialCwd, candidate);
    if (await hasCatalogFile(absoluteCandidate)) {
      return absoluteCandidate;
    }
  }

  const visited = new Set<string>();
  const queue: Array<{ dir: string; depth: number }> = [{ dir: initialCwd, depth: 0 }];
  const ignored = new Set<string>(['node_modules', '.git', 'dist', 'build']);
  const maxDepth = 4;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.dir) || current.depth > maxDepth) {
      continue;
    }
    visited.add(current.dir);

    if (await hasCatalogFile(current.dir)) {
      return current.dir;
    }

    let entries: Dirent[] = [];
    try {
      entries = await readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (ignored.has(entry.name)) {
        continue;
      }
      const nextDir = join(current.dir, entry.name);
      queue.push({ dir: nextDir, depth: current.depth + 1 });
    }
  }

  return null;
}

async function hasCatalogFile(directory: string): Promise<boolean> {
  const filePath = join(directory, 'pnpm-workspace.yaml');
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return false;
    }
    const contents = await readFile(filePath, 'utf8');
    return /\bcatalogs?:/.test(contents);
  } catch {
    return false;
  }
}

// CommonJS: check if this file is being executed directly
const isExecutedAsScript =
  typeof require !== "undefined" &&
  require.main === module;

if (isExecutedAsScript) {
  workflow(api).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
