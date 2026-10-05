import { build } from 'esbuild';

await build({
  entryPoints: { index: 'src/index.ts' },
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
});
