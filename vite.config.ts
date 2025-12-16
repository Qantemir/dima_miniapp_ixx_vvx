import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/', // Абсолютные пути для продакшена
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      clsx$: path.resolve(__dirname, "./src/shims/clsx.ts"),
      "@radix-ui/react-slot": path.resolve(
        __dirname,
        "./node_modules/@radix-ui/react-slot/dist/index.mjs"
      ),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    // Оптимизация сборки для production
    target: 'esnext',
    // Временно отключаем минификацию для отладки ошибки "Cannot access 'O' before initialization"
    minify: false,
    cssCodeSplit: true, // Разделение CSS
    // Включаем sourcemap для чтения стэков в проде
    sourcemap: true,
    chunkSizeWarningLimit: 1000, // Увеличиваем лимит предупреждений
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Разделяем большие библиотеки на отдельные чанки
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-animations';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Остальные node_modules
            return 'vendor';
          }
        },
        // Используем абсолютные пути для чанков в продакшене
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Форматируем имена чанков для лучшей совместимости
        format: 'es',
      },
      onwarn(warning, warn) {
        // Игнорируем предупреждения о комментариях PURE из react-helmet-async
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' || 
            (warning.message && warning.message.includes('PURE'))) {
          return;
        }
        warn(warning);
      },
    },
    // Улучшаем совместимость модулей
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
}));
