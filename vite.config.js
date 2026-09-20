import { defineConfig,loadEnv } from 'vite';
import environmentHandler from './api/environment.js';
import closureHandler from './api/closures.js';
import transitHandler from './api/transit.js';
import {createVoiceHandler} from './api/voice.js';
import { fileURLToPath } from 'node:url';
const api = { name:'fieldlens-public-environment', configureServer(server){server.middlewares.use('/api/environment',(req,res)=>environmentHandler(req,res));server.middlewares.use('/api/closures',closureHandler);server.middlewares.use('/api/transit',transitHandler);}, configurePreviewServer(server){server.middlewares.use('/api/environment',(req,res)=>environmentHandler(req,res));server.middlewares.use('/api/closures',closureHandler);server.middlewares.use('/api/transit',transitHandler);} };
const pages=['welcome','project','demo','plan','conditions','talk','bus','sources','settings'];
const pageRoutes=server=>{server.middlewares.use((req,res,next)=>{for(const name of pages){const path='/'+name;if(req.url===path||req.url?.startsWith(`${path}?`))req.url=req.url.replace(path,`${path}.html`);}next();});};
export default defineConfig(({mode})=>{
const localEnv=loadEnv(mode,process.cwd(),'ELEVENLAB');
const voiceHandler=createVoiceHandler({env:{...localEnv,...process.env}});
const voiceApi={name:'fieldlens-voice-api',configureServer(server){server.middlewares.use('/api/voice',voiceHandler);},configurePreviewServer(server){server.middlewares.use('/api/voice',voiceHandler);}};
return {
  base: './',
  plugins:[api,voiceApi,{name:'fieldlens-page-routes',configureServer:pageRoutes,configurePreviewServer:pageRoutes}],
  css: { postcss: {} },
  server: { host: '127.0.0.1', port: 5194, strictPort: true },
  build: { target: 'es2022', chunkSizeWarningLimit: 900, rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),...Object.fromEntries(pages.map(name=>[name,fileURLToPath(new URL('./'+name+'.html',import.meta.url))])),explorer:fileURLToPath(new URL('./explorer.html',import.meta.url))}} },
};});
