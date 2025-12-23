import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  external: ['react', 'react-i18next', 'i18next'],
  splitting: false,
  clean: true,
});
