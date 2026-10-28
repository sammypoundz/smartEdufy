import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'smart-edufy-icon.png'],
      manifest: {
        name: 'SmartEdufy - AI powered school management system',
        short_name: 'SmartEdufy',
        description: 'SmartEdufy - AI powered school management system',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'smart-edufy-icon.png',
            sizes: '192x192 512x512 2246x2208',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        // The app's main JS bundle is large (pre-existing chunking); allow it
        // in the precache so the shell truly loads offline.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // App shell: precache build assets so the app boots and navigates
        // offline. Data lives separately in IndexedDB (per-user, per-school).
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        runtimeCaching: [
          {
            // Previously viewed uploads open offline (cache-first).
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'edufy-uploads',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Never cache API responses in the SW — auth'd data flows through
            // the per-user IndexedDB bundle + op queue instead.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    include: ['@heroicons/react', 'axios']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['@heroicons/react'],
        },
      },
    },
  },
})