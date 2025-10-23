#!/usr/bin/env node

import { api } from "@codemod.com/workflow";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const initialCwd = process.cwd();

type PackageJson = {
  name?: string;
  workspaces?: string[] | {
    packages?: string[];
    catalog?: Record<string, string>;
    catalogs?: Record<string, Record<string, string>>;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type PnpmWorkspaceYaml = {
  packages?: string[];
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
};

/**
 * Migrate from bun catalog to pnpm workspace catalog
 * 
 * bun format (package.json):
 *   {
 *     "workspaces": {
 *       "packages": ["packages/*"],
 *       "catalog": {
 *         "react": "^19.2.0",
 *         "lodash": "^4.17.21"
 *       }
 *     }
 *   }
 * 
 * pnpm format (pnpm-workspace.yaml):
 *   packages:
 *     - packages/*
 *   catalog:
 *     react: ^19.2.0
 *     lodash: ^4.17.21
 */
export async function workflow({ files }: typeof api) {
  console.log('🔄 Migrating bun catalog to pnpm format...\n');

  // 1. Read root package.json
  const rootPackageJsonFiles = files("package.json").json();
  const rootPackageJson = (
    await rootPackageJsonFiles.map(({ getContents }) => getContents<PackageJson>())
  ).pop();

  if (!rootPackageJson) {
    console.log('❌ Root package.json not found');
    return;
  }

  // Extract catalog from workspaces object (bun format)
  const workspacesObj = typeof rootPackageJson.workspaces === 'object' && !Array.isArray(rootPackageJson.workspaces) 
    ? rootPackageJson.workspaces 
    : null;
  const catalog = workspacesObj?.catalog;
  const catalogs = workspacesObj?.catalogs;
  
  if (!catalog && !catalogs) {
    console.log('⚠️  No catalog found in package.json workspaces');
    console.log('💡 This codemod requires bun workspace with catalog configuration');
    console.log('💡 Expected format: { "workspaces": { "catalog": {...} } }');
    return;
  }

  // Merge all catalogs
  const mergedCatalog: Record<string, string> = {};
  if (catalog) {
    Object.assign(mergedCatalog, catalog);
  }
  if (catalogs) {
    for (const [name, cat] of Object.entries(catalogs)) {
      console.log(`📦 Merging named catalog: ${name}`);
      Object.assign(mergedCatalog, cat);
    }
  }

  console.log(`📊 Found ${Object.keys(mergedCatalog).length} catalog entries\n`);

  // 2. Check if pnpm-workspace.yaml exists
  const pnpmWorkspaceFiles = files("pnpm-workspace.yaml").yaml();
  const existingWorkspace = (
    await pnpmWorkspaceFiles.map(({ getContents }) => getContents<PnpmWorkspaceYaml>())
  ).pop();

  const workspacePackages = workspacesObj?.packages || 
    (Array.isArray(rootPackageJson.workspaces) ? rootPackageJson.workspaces : ['packages/*']);

  // 3. Create or update pnpm-workspace.yaml
  if (existingWorkspace) {
    console.log('📝 Updating existing pnpm-workspace.yaml');
    await pnpmWorkspaceFiles.update<PnpmWorkspaceYaml>((workspace) => {
      workspace.catalog = mergedCatalog;
      
      if (!workspace.packages) {
        workspace.packages = workspacePackages;
      }
      
      return workspace;
    });
  } else {
    console.log('📝 Creating pnpm-workspace.yaml');
    // Create new pnpm-workspace.yaml
    const yamlContent = `packages:\n${workspacePackages.map((p: string) => `  - '${p}'`).join('\n')}\n\ncatalog:\n${Object.entries(mergedCatalog)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, version]) => `  ${name}: ${version}`)
      .join('\n')}\n`;
    
    await writeFile(join(initialCwd, 'pnpm-workspace.yaml'), yamlContent, 'utf-8');
  }

  console.log('✅ Created/updated pnpm-workspace.yaml with catalog');

  // 4. Remove catalog from root package.json (convert workspaces back to array)
  await rootPackageJsonFiles.update<PackageJson>((pkg) => {
    // Convert workspaces object back to array
    if (typeof pkg.workspaces === 'object' && !Array.isArray(pkg.workspaces) && pkg.workspaces.packages) {
      pkg.workspaces = pkg.workspaces.packages;
    }
    console.log('✅ Removed catalog from package.json and converted workspaces to array format');
    return pkg;
  });

  // 5. Verify workspace packages still have catalog: references
  const packageJsonGlobs = workspacePackages.map((p: string) => `${p}/package.json`);
  
  let packagesWithCatalog = 0;
  await files(packageJsonGlobs)
    .json()
    .map(async ({ getContents }) => {
      const pkg = await getContents<PackageJson>();
      
      const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
      
      for (const field of depFields) {
        const deps = pkg[field];
        if (!deps) continue;

        for (const [name, version] of Object.entries(deps)) {
          if (version.startsWith('catalog:')) {
            packagesWithCatalog++;
            break;
          }
        }
      }
    });

  console.log('\n📝 Migration summary:');
  console.log('  ✅ Catalog migrated from package.json to pnpm-workspace.yaml');
  console.log('  ✅ Removed catalog from root package.json');
  console.log(`  ℹ️  ${packagesWithCatalog} workspace package(s) using catalog: references`);
  console.log('\n📋 Next steps:');
  console.log('  1. Remove bun.lockb (if exists)');
  console.log('  2. Run: pnpm install');
  console.log('  3. Verify: Check pnpm-workspace.yaml');
  console.log('\n💡 Note: This migration is compatible with pnpm v9.5.0+');
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
