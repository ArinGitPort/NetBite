import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '.',
  envPrefix: ['VITE_'],
  build: { outDir: 'dist', sourcemap: false },
  server: { port: 4174, strictPort: true },
});
