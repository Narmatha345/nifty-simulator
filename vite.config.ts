import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Served from https://<user>.github.io/nifty-simulator/ in production,
  // so asset URLs need that path prefix; dev server stays at the root.
  base: command === 'build' ? '/nifty-simulator/' : '/',
  server: {
    // Bind to all network interfaces by default so the dev server is
    // reachable from other devices on the same network/tailnet (e.g. over
    // Tailscale), not just localhost.
    host: true,
  },
}))
