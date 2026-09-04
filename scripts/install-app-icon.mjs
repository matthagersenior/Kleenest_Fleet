import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const CANONICAL_ICON_SOURCE='https://raw.githubusercontent.com/matthagersenior/Kleenest_Production/2d5830b529d9e0e54dbf268d5011de453213a2de/scripts/app-icon.base64';
const scriptsDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptsDir,'..');
const targetDir=path.join(root,'assets');
const target=path.join(targetDir,'app-icon.png');

const response=await fetch(CANONICAL_ICON_SOURCE,{cache:'no-store'});
if(!response.ok)throw new Error(`Canonical Kleenest icon download failed: ${response.status}`);
const encoded=(await response.text()).trim();
const bytes=Buffer.from(encoded,'base64');
if(bytes.length<1024||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Canonical Kleenest icon is not a valid PNG payload.');
fs.mkdirSync(targetDir,{recursive:true});
fs.writeFileSync(target,bytes);
const digest=crypto.createHash('sha256').update(bytes).digest('hex');
console.log(`Installed canonical Kleenest app icon at ${path.relative(root,target)} (sha256 ${digest}).`);
