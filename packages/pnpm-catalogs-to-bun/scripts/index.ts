#!/usr/bin/env node

import { api } from "@codemod.com/workflow";
import process from "node:process";

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
 * Migrate from pnpm workspace catalog to bun catalog
 * 
 * pnpm format (pnpm-workspace.yaml):
 *   packages:
 *     - packages/*
 *   catalog:
 *     react: ^19.2.0
 *     lodash: ^4.17.21
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
 */
export async function workflow({ files }: typeof api) {
  console.log('🔄 Migrating pnpm catalogs to bun format...\n');

  // 1. Read pnpm-workspace.yaml
  const pnpmWorkspaceFiles = files("pnpm-workspace.yaml").yaml();
  const pnpmWorkspaceData = (
    await pnpmWorkspaceFiles.map(({ getContents }) => getContents<PnpmWorkspaceYaml>())
  ).pop();

  if (!pnpmWorkspaceData) {
    console.log('❌ pnpm-workspace.yaml not found');
    console.log('💡 This codemod requires a pnpm workspace with catalog configuration');
    return;
  }

  if (!pnpmWorkspaceData.catalog && !pnpmWorkspaceData.catalogs) {
    console.log('⚠️  No catalog found in pnpm-workspace.yaml');
    console.log('💡 Nothing to migrate');
    return;
  }

  // 2. Read root package.json
  const rootPackageJsonFiles = files("package.json").json();
  const rootPackageJson = (
    await rootPackageJsonFiles.map(({ getContents }) => getContents<PackageJson>())
  ).pop();

  if (!rootPackageJson) {
    console.log('❌ Root package.json not found');
    return;
  }

  // 3. Merge catalogs
  const mergedCatalog: Record<string, string> = {};
  
  if (pnpmWorkspaceData.catalog) {
    Object.assign(mergedCatalog, pnpmWorkspaceData.catalog);
  }
  
  if (pnpmWorkspaceData.catalogs) {
    // Merge all named catalogs into one (bun doesn't support named catalogs yet)
    for (const [name, catalog] of Object.entries(pnpmWorkspaceData.catalogs)) {
      console.log(`📦 Merging catalog: ${name}`);
      Object.assign(mergedCatalog, catalog);
    }
  }

  console.log(`📊 Found ${Object.keys(mergedCatalog).length} catalog entries\n`);

  // 4. Update root package.json with catalog (bun format)
  await rootPackageJsonFiles.update<PackageJson>((pkg) => {
    const workspacePackages = pnpmWorkspaceData.packages || ['packages/*'];
    
    // Convert to bun's workspaces object format
    pkg.workspaces = {
      packages: workspacePackages,
      catalog: Object.fromEntries(
        Object.entries(mergedCatalog).sort(([a], [b]) => a.localeCompare(b))
      )
    };

    console.log('✅ Added catalog to root package.json (bun format)');
    
    return pkg;
  });

  // 5. Update all package.json files to use catalog: references
  const packageGlobs = pnpmWorkspaceData.packages || ['packages/*'];
  const packageJsonGlobs = packageGlobs.map(p => `${p}/package.json`);
  
  console.log('\n🔍 Checking workspace packages...');
  
  await files(packageJsonGlobs)
    .json()
    .update<PackageJson>((pkg) => {
      let updated = false;

      const depFields = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
      
      for (const field of depFields) {
        const deps = pkg[field];
        if (!deps) continue;

        for (const [name, version] of Object.entries(deps)) {
          // If this dependency is in catalog and uses catalog: reference
          if (version.startsWith('catalog:') && mergedCatalog[name]) {
            // Keep as is - already using catalog reference
            continue;
          }
          
          // If version matches catalog version, convert to catalog:
          if (mergedCatalog[name] && mergedCatalog[name] === version) {
            deps[name] = 'catalog:';
            updated = true;
          }
        }
      }

      if (updated && pkg.name) {
        console.log(`  📦 Updated ${pkg.name}`);
      }

      return pkg;
    });

  console.log('\n📝 Migration summary:');
  console.log('  ✅ Catalog migrated from pnpm-workspace.yaml to package.json');
  console.log('  ✅ All workspace packages updated to use catalog: references');
  console.log('\n📋 Next steps:');
  console.log('  1. Remove pnpm-workspace.yaml (or keep for backward compatibility)');
  console.log('  2. Run: rm pnpm-lock.yaml');
  console.log('  3. Run: bun install');
  console.log('  4. Verify: bun pm ls');
  console.log('\n💡 Note: Bun catalog feature requires Bun v1.1.30+');
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
