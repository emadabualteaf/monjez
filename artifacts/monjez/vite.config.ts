import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // تحديد المجلد الحالي كجذر للمشروع
  root: process.cwd(),
  
  plugins: [
    react(),
  ],

  build: {
    sourcemap: false,
    outDir: 'dist',
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5174,
    strictPort: true, 
    
    // إعداد الوكيل (Proxy) للاتصال بالسيرفر
    proxy: {
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        secure: false,
        // إضافة هذا السطر لضمان عدم وجود مشاكل في إعادة توجيه المسارات
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
});