import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'reminder-sw.js'],
      workbox: { importScripts: ['reminder-sw.js'], globPatterns: ['**/*.{js,css,html,png,woff2,webmanifest}'] },
      manifest: {
        id: './',
        name: 'Feel · Mood Journal',
        short_name: 'Feel',
        description: 'A private mood journal.',
        display: 'standalone',
        start_url: './',
        scope: './',
        background_color: '#fff8f7',
        theme_color: '#fff8f7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
