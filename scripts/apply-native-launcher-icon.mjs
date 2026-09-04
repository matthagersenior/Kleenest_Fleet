import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptsDir, '..');
const source = path.join(root, 'assets', 'app-icon.png');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');

if (!fs.existsSync(source) || !fs.statSync(source).size) {
  throw new Error('Fleet launcher artwork is missing.');
}
if (!fs.existsSync(res)) {
  throw new Error('Android resources do not exist; run Expo prebuild first.');
}

// Expo prebuild renders the supplied source artwork into density-correct Android
// launcher resources. Keep those generated files intact rather than replacing
// every density with the raw source PNG; AAPT2 can reject the latter while the
// Expo-rendered resources are Android-safe.
for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
  const dir = path.join(res, `mipmap-${density}`);
  const launcher = path.join(dir, 'ic_launcher.webp');
  const launcherPng = path.join(dir, 'ic_launcher.png');
  if (!fs.existsSync(launcher) && !fs.existsSync(launcherPng)) {
    throw new Error(`Expo did not generate a Fleet launcher resource for ${density}.`);
  }
}

console.log('Verified Expo-rendered Kleenest Fleet launcher artwork.');
