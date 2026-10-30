import { build } from 'esbuild';
import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
await mkdir('dist', { recursive: true });
await Promise.all([
  build({ entryPoints: ['src/main/index.ts'], outfile: 'dist/main.cjs', bundle: true, platform: 'node', format: 'cjs', packages: 'external', sourcemap: true }),
  build({ entryPoints: ['src/main/preload.ts'], outfile: 'dist/preload.cjs', bundle: true, platform: 'node', format: 'cjs', external: ['electron'] }),
  build({ entryPoints: ['src/main/browser-worker.ts'], outfile: 'dist/browser-worker.cjs', bundle: true, platform: 'node', format: 'cjs', packages: 'external', sourcemap: true }),
  build({ entryPoints: ['src/renderer/main.tsx'], outfile: 'dist/ui.js', bundle: true, platform: 'browser', format: 'iife', minify: true, define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.css': 'css' } })
]);
await copyFile('src/renderer/index.html', 'dist/index.html');
await mkdir('dist/licenses', {recursive:true});
const inventory=[];
async function scan(dir){for(const item of await readdir(dir,{withFileTypes:true})){if(!item.isDirectory()&&!item.isSymbolicLink())continue;const folder=path.join(dir,item.name);if(item.name.startsWith('@')){await scan(folder);continue;}try{const p=JSON.parse(await readFile(path.join(folder,'package.json'),'utf8'));const files=(await readdir(folder)).filter(f=>/^(license|copying|notice)/i.test(f));for(const f of files){try{await copyFile(path.join(folder,f),path.join('dist/licenses',(p.name+'-'+f).replaceAll('/','_')));}catch{}}inventory.push({name:p.name,version:p.version,license:p.license});}catch{}}}
await scan('node_modules');
await writeFile('dist/licenses/inventory.json',JSON.stringify(inventory,null,2));
