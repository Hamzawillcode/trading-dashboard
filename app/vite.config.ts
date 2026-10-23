// vite.config.ts: settings for Vite (the dev server + build tool).
// "Plugins" teach Vite extra tricks.

import react from '@vitejs/plugin-react'       // understands JSX/TSX + enables fast refresh (HMR) for React
import tailwindcss from '@tailwindcss/vite'    // scans our files for Tailwind classes and generates the CSS
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
