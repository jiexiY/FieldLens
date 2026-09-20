import { defineConfig } from 'vite';
import environmentHandler from './api/environment.js';
import { fileURLToPath } from 'node:url';
const api = { name:'fieldlens-public-environment', configureServer(server){server.middlewares.use('/api/environment',(req,res)=>environmentHandler(req,res));}, configurePreviewServer(server){server.middlewares.use('/api/environment',(req,res)=>environmentHandler(req,res));} };
export default defineConfig({
  base: './',
  plugins:[api],
  css: { postcss: {} },
  server: { host: '127.0.0.1', port: 5194, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 900, rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),explorer:fileURLToPath(new URL('./explorer.html',import.meta.url))}} },
});
