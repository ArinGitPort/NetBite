import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  envDir: '.',
  envPrefix: ['VITE_'],
  build: { outDir: 'dist', sourcemap: false },
  server: { port: 4174, strictPort: true },
});
