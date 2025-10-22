import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Read VITE_PORT from env (falls back to 5173)
const port = Number(process.env.VITE_PORT || 5173);
const serverPort = Number(process.env.SERVER_PORT || 8000);

export default defineConfig({
  plugins: [react()],
  server: {
    port,
    proxy: {
      '/api': {
        target: `http://localhost:${serverPort}`, // your backend server
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
