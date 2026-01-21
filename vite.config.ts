/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { qbtProxy } from './vite.proxy.ts';

const target = process.env.QBT_URL ?? 'http://127.0.0.1:9000';

export default defineConfig({
  base: './',
  publicDir: 'static',
  plugins: [svelte(), svelteTesting()],
  build: { outDir: 'dist/public', emptyOutDir: true },
  server: { proxy: { '/api': qbtProxy(target) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
