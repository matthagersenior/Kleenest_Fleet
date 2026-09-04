import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptsDir,'..');
const source=path.join(root,'assets','app-icon.png');
const res=path.join(root,'android','app','src','main','res');
if(!fs.existsSync(source)||!fs.statSync(source).size)throw new Error('Fleet launcher artwork is missing.');
if(!fs.existsSync(res))throw new Error('Android resources do not exist; run Expo prebuild first.');

for(const density of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']){
 const dir=path.join(res,`mipmap-${density}`);
 fs.mkdirSync(dir,{recursive:true});
 for(const name of fs.readdirSync(dir)){
  if(/^ic_launcher(?:_round|_foreground)?\.(?:png|webp)$/.test(name))fs.rmSync(path.join(dir,name));
 }
 fs.copyFileSync(source,path.join(dir,'ic_launcher.png'));
 fs.copyFileSync(source,path.join(dir,'ic_launcher_round.png'));
}
for(const dirName of ['mipmap-anydpi-v26']){
 const dir=path.join(res,dirName);
 if(!fs.existsSync(dir))continue;
 for(const name of ['ic_launcher.xml','ic_launcher_round.xml']){
  const file=path.join(dir,name);
  if(fs.existsSync(file))fs.rmSync(file);
 }
}
console.log('Applied supplied Kleenest Fleet artwork directly to Android launcher resources.');
