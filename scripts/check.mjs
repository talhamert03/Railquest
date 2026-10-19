import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {IMAGE_SOURCES} from '../dist/js/resources.js';
const root=new URL('../dist/',import.meta.url);
const referencedAssets=new Set(Object.values(IMAGE_SOURCES));
const files=await readdir(root,{recursive:true});let size=0;
for(const file of files){const path=new URL(file,root),s=await stat(path);if(!s.isFile())continue;size+=s.size;if(file.endsWith('.js'))execFileSync(process.execPath,['--check',path.pathname]);}
for(const file of ['index.html',...files.filter(f=>f.endsWith('.css')||f.endsWith('.js'))]){
 const source=await readFile(new URL(file,root),'utf8');
 for(const match of source.matchAll(/(?:src=|href=|url\()\s*['"]?(\.\/?[^'"\s)]+)/g)){
  const relative=match[1];if(relative.endsWith('/'))continue;
  // HTML strings in modules resolve relative to the document, CSS to its own file.
  await stat(resolve(file.endsWith('.js')?root.pathname:dirname(new URL(file,root).pathname),relative));
  if(relative.startsWith('./assets/'))referencedAssets.add(relative);
 }
}
JSON.parse(await readFile(new URL('../.openai/hosting.json',root),'utf8'));
const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
for(const icon of manifest.icons||[])referencedAssets.add(icon.src);
const worker=await readFile(new URL('sw.js',root),'utf8');
// Referenced art, fonts and startup resources must be in the same offline version.
for(const source of referencedAssets){
 await stat(new URL(source,root));
 if(!worker.includes(`'${source}'`))throw new Error(`Offline asset missing ${source}`);
}
for(const file of files.filter(f=>f.endsWith('.css')))if(!worker.includes(`'./${file}'`))throw new Error(`Offline stylesheet missing ${file}`);
for(const file of files.filter(f=>f.startsWith('js/')&&f.endsWith('.js'))){
 if(!worker.includes(`'./${file}'`))throw new Error(`Offline bundle missing ${file}`);
 const source=await readFile(new URL(file,root),'utf8');
 for(const match of source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g))await stat(resolve(dirname(new URL(file,root).pathname),match[1]));
 for(const match of source.matchAll(/import\(['"](\.\.?\/[^'"]+)['"]\)/g))await stat(resolve(dirname(new URL(file,root).pathname),match[1]));
}
for(const file of ['../billing-server/server.mjs','../billing-server/verification.mjs'])execFileSync(process.execPath,['--check',new URL(file,root).pathname]);
console.log(`${files.length} entries checked. Game payload ${(size/1024).toFixed(0)} KiB. Local assets and JS syntax valid.`);
