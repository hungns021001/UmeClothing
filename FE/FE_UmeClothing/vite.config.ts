import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Backend CORS mặc định chỉ cho phép http://localhost:5173 nên cố định cổng này.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
