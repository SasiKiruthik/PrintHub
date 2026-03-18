import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',  // Allow external connections from mobile/other devices
    cors: true,       // Enable CORS
    strictPort: false // Use next available port if 5173 is taken
  }
});


