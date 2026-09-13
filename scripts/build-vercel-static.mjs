import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const outputDir = join(root, 'vercel-output');
const prerenderDir = join(root, 'dist', 'server', 'prerendered-routes');
const clientDir = join(root, 'dist', 'client');
const indexHtml = join(prerenderDir, 'index.html');

console.log('Building LoadLight for static Vercel deployment...');

const build = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vinext', 'build'],
  { cwd: root, stdio: 'inherit', shell: false },
);

if (!existsSync(indexHtml) || !existsSync(clientDir)) {
  process.exit(build.status ?? 1);
}

if (build.status !== 0) {
  console.warn('vinext build exited non-zero, but prerendered output exists. Continuing static export.');
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

function copyDirectoryContents(from, to) {
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.name === '.vite') continue;
    const source = join(from, entry.name);
    const target = join(to, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(target, { recursive: true });
      copyDirectoryContents(source, target);
    } else {
      copyFileSync(source, target);
    }
  }
}

copyDirectoryContents(prerenderDir, outputDir);
copyDirectoryContents(clientDir, outputDir);

console.log('Static Vercel output ready at vercel-output/');
