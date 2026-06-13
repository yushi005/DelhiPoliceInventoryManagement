import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // Project path contains a ':' (".../8:6:26/...") which breaks Vite's
      // fs allow-list path matching, causing a 403. Disable strict fs serving for local dev.
      strict: false,
    },
  },
})
