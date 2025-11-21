import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
    minify: 'esbuild', // Быстрый минификатор
    cssCodeSplit: true, // Разделение CSS
    sourcemap: false, // Отключаем sourcemaps в production для скорости
    rollupOptions: {
      output: {
        manualChunks: {
          // Разделяем большие библиотеки на отдельные чанки
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-animations': ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Увеличиваем лимит предупреждений
  },
}));
