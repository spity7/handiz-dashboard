import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'react-quill': resolve(__dirname, 'node_modules/react-quill-new'),
      'react-quill/dist/quill.snow.css': resolve(__dirname, 'node_modules/react-quill-new/dist/quill.snow.css'),
      'react-quill/dist/quill.bubble.css': resolve(__dirname, 'node_modules/react-quill-new/dist/quill.bubble.css'),
    },
  },
})
