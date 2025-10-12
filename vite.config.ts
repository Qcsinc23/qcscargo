import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'
import { chunkSplitPlugin } from 'vite-plugin-chunk-split'
// import viteImagemin from 'vite-plugin-imagemin'

const isProd = process.env.BUILD_MODE === 'prod'

export default defineConfig({
  plugins: [
    react(),
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    }),
    // Image compression disabled for now due to build script dependencies
    // isProd && viteImagemin({
    //   gifsicle: { optimizationLevel: 7 },
    //   mozjpeg: { quality: 85 },
    //   pngquant: { quality: [0.8, 0.9], speed: 4 },
    //   svgo: {
    //     plugins: [
    //       { name: 'removeViewBox' },
    //       { name: 'removeEmptyAttrs', active: false }
    //     ]
    //   }
    // }),
    // Code splitting optimization using manual chunks
    isProd && chunkSplitPlugin({
      strategy: 'default'
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2018',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'terser',
    // Reduce preload warnings by being more selective about what gets preloaded
    modulePreload: {
      polyfill: false
    },
    terserOptions: {
      compress: {
        drop_console: isProd,
        drop_debugger: isProd,
        pure_funcs: isProd ? ['console.log', 'console.info'] : []
      }
    },
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching and performance
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom'],
          'react-router': ['react-router-dom'],
          
          // UI and styling
          'ui-vendor': [
            'lucide-react',
            'class-variance-authority',
            'clsx',
            'tailwind-merge'
          ],
          
          // Radix UI components
          'radix-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip'
          ],
          
          // Forms and validation
          'forms-vendor': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          
          // Utilities and other libraries
          'utils-vendor': [
            'date-fns',
            'sonner',
            'vaul',
            'cmdk',
            'input-otp',
            'embla-carousel-react',
            'next-themes'
          ],
          
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js'],
          
          // Charts
          'charts-vendor': ['recharts']
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const extType = info[info.length - 1]
          if (/\.(png|jpe?g|webp|avif|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash].${extType}`
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `assets/fonts/[name]-[hash].${extType}`
          }
          if (/\.css$/i.test(assetInfo.name || '')) {
            return `assets/css/[name]-[hash].${extType}`
          }
          return `assets/[name]-[hash].${extType}`
        }
      }
    }
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})

