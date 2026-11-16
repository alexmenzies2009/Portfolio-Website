#!/usr/bin/env node
// Runs the Astro CLI with a supported Node.js version.
//
// Why this exists: `npm run` puts every parent folder's node_modules/.bin first on the PATH.
// If one of those folders contains an old `node` binary (this happens when the `node` npm
// package was once installed in a parent or home folder), Astro would start on that old
// version and refuse to run. This launcher finds a recent Node.js instead.
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_MAJOR = 22;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astroCli = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const major = (v) => Number(String(v).replace(/^v/, '').split('.')[0]);

function findNode() {
  if (major(process.versions.node) >= MIN_MAJOR) return process.execPath;
  const exe = process.platform === 'win32' ? 'node.exe' : 'node';
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir || dir.includes('node_modules')) continue;
    const candidate = path.join(dir, exe);
    if (!existsSync(candidate)) continue;
    try {
      if (major(execFileSync(candidate, ['-v'], { encoding: 'utf8' }).trim()) >= MIN_MAJOR) return candidate;
    } catch {}
  }
  return null;
}

const node = findNode();
if (!node) {
  console.error(`This project needs Node.js ${MIN_MAJOR} or newer, but only v${process.versions.node} was found.`);
  process.exit(1);
}
const env = { ...process.env, PATH: path.dirname(node) + path.delimiter + (process.env.PATH || '') };
const result = spawnSync(node, [astroCli, ...process.argv.slice(2)], { stdio: 'inherit', cwd: root, env });
process.exit(result.status == null ? 1 : result.status);
