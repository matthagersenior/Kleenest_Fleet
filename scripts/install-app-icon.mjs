import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(scriptsDir,'..');
const targetDir=path.join(root,'assets');
const target=path.join(targetDir,'app-icon.png');

// Use the same proven Kleenest launcher artwork that ships in the Business app.
// Pin the source commit so Fleet builds are deterministic while the repos remain split.
const canonicalIconUrl='https://raw.githubusercontent.com/matthagersenior/Kleenest_Business/db5488f033350a491800fc6254804634ad24192e/scripts/app-icon.base64';
const response=await fetch(canonicalIconUrl);
if(!response.ok)throw new Error(`Unable to load canonical Kleenest launcher artwork (${response.status}).`);
const encoded=(await response.text()).trim();
if(!encoded.startsWith('iVBORw0KGgo'))throw new Error('Canonical Kleenest launcher artwork is not a PNG payload.');
const bytes=Buffer.from(encoded,'base64');
if(bytes.length<1024)throw new Error('Canonical Kleenest launcher artwork decoded to an invalid size.');
fs.mkdirSync(targetDir,{recursive:true});
fs.writeFileSync(target,bytes);
console.log(`Installed canonical Kleenest Fleet app icon at ${path.relative(root,target)}.`);
