import { build } from 'esbuild';

await build({
  entryPoints: { index: 'src/index.ts' },
  outfile: 'dist/index.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
});

await build({
  entryPoints: { react: 'src/react.ts' },
  outfile: 'dist/react.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  external: ['react', '@tanstack/react-query'],
});
