import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.png', 'favicon.ico'],
      manifest: {
        name: 'Horizon Nature - Entretien Bâtiment',
        short_name: 'Horizon Nature',
        description: 'Application de gestion d\'entretien de bâtiment',
        theme_color: '#16a34a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Injecting the build time forces sw.js to change on every deploy,
        // so the browser always detects a new version via reg.update().
        additionalManifestEntries: [
          { url: '/', revision: Date.now().toString() }
        ],
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Production serves the API from the same origin under /api.
            // Exclude auth endpoints while retaining previously loaded page data offline.
            urlPattern: ({ url, request, sameOrigin }) => (
              sameOrigin
              && request.method === 'GET'
              && url.pathname.startsWith('/api/')
              && !url.pathname.startsWith('/api/auth/')
            ),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws-notifications': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws-notifications': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  define: {
    global: 'window',
  },
})
