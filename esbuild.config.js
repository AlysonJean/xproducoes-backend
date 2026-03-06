import esbuild from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Função para encontrar todos os arquivos .ts recursivamente
function getAllTsFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts') && !entry.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const entryPoints = getAllTsFiles('./src');

esbuild.build({
  entryPoints,
  bundle: false,
  outdir: 'dist',
  platform: 'node',
  target: 'node18',
  format: 'esm',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  sourcemap: false,
  minify: false,
  keepNames: true,
}).then(() => {
  console.log('✅ Build completed successfully with esbuild!');
}).catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
