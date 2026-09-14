#!/usr/bin/env node

// Check the files that electron-builder actually put in app.asar. A lockfile
// alone cannot prove that transitive runtime modules reached the archive.
const asar = require('@electron/asar')
const { builtinModules } = require('node:module')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const builtin = new Set(builtinModules.map((name) => name.replace(/^node:/, '')))
const packageJsonPattern = /(?:^|\/)node_modules\/(?:@[^/]+\/)?[^/]+\/package\.json$/

function packageRoot(packageJsonPath) {
  return path.posix.dirname(packageJsonPath)
}

function isDeclarationOnly(root, archivedPaths, metadata) {
  const ownFiles = archivedPaths.filter((name) => name.startsWith(`${root}/`) && !name.slice(root.length + 1).includes('/node_modules/'))
  const declarations = ownFiles.some((name) => name.endsWith('.d.ts')) || /\.d\.ts$/.test(metadata.types || metadata.typings || '')
  const executable = ownFiles.some((name) => /\.(?:js|cjs|mjs|node)$/.test(name))
  const exportTargets = JSON.stringify(metadata.exports || '')
  const runtimeExport = /\.(?:js|cjs|mjs)"/.test(exportTargets)
  return declarations && !executable && !metadata.main && !runtimeExport
}

function findDependency(directory, name, archivedPaths) {
  let current = directory
  while (true) {
    const candidate = path.posix.join(current, 'node_modules', name)
    if (archivedPaths.has(candidate)) return candidate
    if (current === '/') return null
    current = path.posix.dirname(current)
  }
}

function checkArchive(archive) {
  const paths = asar.listPackage(archive)
  const archivedPaths = new Set(paths)
  const packageJsonPaths = paths.filter((name) => packageJsonPattern.test(name))
  const errors = []

  if (!archivedPaths.has('/out/main/index.mjs')) {
    errors.push('Missing main process output: out/main/index.mjs')
  }
  if (packageJsonPaths.length === 0) {
    errors.push('No runtime packages in app.asar')
  }

  for (const packageJsonPath of packageJsonPaths) {
    const root = packageRoot(packageJsonPath)
    let metadata
    try {
      metadata = JSON.parse(asar.extractFile(archive, packageJsonPath.slice(1)))
    } catch (error) {
      errors.push(`${root}: invalid package.json (${error.message})`)
      continue
    }

    // Type-only packages have no executable entry or JS/native files.
    // electron-builder may omit their .d.ts files, so metadata also counts.
    if (isDeclarationOnly(root, paths, metadata)) continue

    // optionalDependencies are allowed to be absent by npm's contract.
    for (const name of Object.keys(metadata.dependencies || {})) {
      // @types/* is a declaration-only namespace even when a runtime package
      // lists it under dependencies instead of devDependencies.
      if (name.startsWith('@types/')) continue
      if (!findDependency(root, name, archivedPaths)) {
        errors.push(`${root}: missing ${name}`)
      }
    }
  }

  // The main file is ESM. Check its external imports separately because its
  // root package.json also lists renderer packages that Electron does not load.
  if (archivedPaths.has('/out/main/index.mjs')) {
    const main = asar.extractFile(archive, 'out/main/index.mjs').toString()
    const imports = main.matchAll(/^import\s+(?:[^;]*?\s+from\s+)?["']([^"']+)["'];/gm)
    for (const [, name] of imports) {
      if (name === 'electron' || builtin.has(name.replace(/^node:/, '')) || name.startsWith('.') || name.startsWith('/')) continue
      const packageName = name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0]
      if (!findDependency('/out/main', packageName, archivedPaths)) {
        errors.push(`out/main/index.mjs: missing ${packageName}`)
      }
    }
  }

  if (errors.length) {
    console.error(`${archive}: ${errors.length} missing or invalid runtime dependencies`)
    for (const error of errors) console.error(`  ${error}`)
    return false
  }

  // Recreate only debug and ms from the archive, preserving their Node paths.
  // This runs the import that caused the signed test app's startup crash.
  // If a future release no longer uses debug, the graph check above still
  // checks the packages that remain.
  if (!archivedPaths.has('/node_modules/debug')) {
    console.log(`${archive}: ${packageJsonPaths.length} packaged modules checked; debug is not packaged`)
    return true
  }
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'devkitty-asar-deps-'))
  try {
    for (const archivedPath of paths) {
      if (!/^\/node_modules\/(debug|ms)\//.test(archivedPath)) continue
      const stat = asar.statFile(archive, archivedPath.slice(1))
      const target = path.join(scratch, archivedPath.slice(1))
      if (stat.files) {
        fs.mkdirSync(target, { recursive: true })
      } else if (!stat.link) {
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, asar.extractFile(archive, archivedPath.slice(1)))
      }
    }
    const result = spawnSync(process.execPath, ['-e', 'require(process.argv[1])("packaged dependency smoke check")', path.join(scratch, 'node_modules/debug')], { encoding: 'utf8' })
    if (result.status !== 0) {
      console.error(`${archive}: debug failed to load from extracted archive files`)
      console.error((result.stderr || result.error?.message || '').trim())
      return false
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true })
  }

  console.log(`${archive}: ${packageJsonPaths.length} packaged modules checked; debug loaded`)
  return true
}

const archives = process.argv.slice(2)
if (archives.length === 0) {
  console.error('Usage: node scripts/check-packaged-deps.cjs APP_ASAR [APP_ASAR...]')
  process.exit(2)
}

let passed = true
for (const archive of archives) {
  try {
    if (!checkArchive(archive)) passed = false
  } catch (error) {
    console.error(`${archive}: ${error.stack || error}`)
    passed = false
  }
}
if (!passed) process.exit(1)
