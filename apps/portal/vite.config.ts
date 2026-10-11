import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath, URL } from 'node:url';

const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(uploadSourceMaps
    ? [sentryVitePlugin({ org: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, authToken: process.env.SENTRY_AUTH_TOKEN, release: { name: process.env.VITE_RELEASE || 'netbite-portal@1.0.0' }, sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] } })]
    : [])],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  envDir: '.',
  envPrefix: ['VITE_'],
  build: { outDir: 'dist', sourcemap: uploadSourceMaps ? 'hidden' : false },
  server: { port: 4174, strictPort: true },
});
