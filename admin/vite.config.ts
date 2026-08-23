import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '..',
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  build: { outDir: 'dist', sourcemap: true },
  server: { port: 4174 },
});
