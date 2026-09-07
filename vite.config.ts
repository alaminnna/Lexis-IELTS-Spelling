import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import path from "node:path"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["favicon.svg"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png,webp}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^\/api\/dictionary\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "dictionary",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname ?? ".", "./src"),
    },
  },
  server: {
    proxy: {
      "/api/dictionary": {
        target: "https://www.english-bangla.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dictionary/, "/dictionary"),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 3000,
  },
})
