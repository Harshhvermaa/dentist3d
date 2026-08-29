import { defineConfig } from 'vite';
import { resolve } from 'path';

// GitHub Pages serves a project repo from a subpath, so the built site needs
// its asset URLs prefixed. Dev stays at "/" so `npm run dev` is unchanged.
const REPO_BASE = '/dentist3d/';

export default defineConfig(({ command }) => ({
  root: '.',
  base: command === 'build' ? REPO_BASE : '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Multi-page app — one HTML entry per page
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        services: resolve(__dirname, 'services.html'),
        blog: resolve(__dirname, 'blog.html'),
        contact: resolve(__dirname, 'contact.html'),
      },
    },
  },
  server: {
    open: true,
  },
}));
