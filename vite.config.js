import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    base: '/',
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        host: true,
        headers: {
            // Required for SharedArrayBuffer (multithreaded ONNX Wasm)
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
    },
})
