// Rasterize the source SVG icons in public/ into the PNG sizes the PWA
// manifest and iOS home-screen install flow expect. Run with:
//
//   node scripts/generate-icons.mjs
//
// Outputs to public/icons/. Commit the PNGs; they're small and make the
// repo buildable without network/native deps in CI.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outDir = path.resolve('public/icons');
await fs.mkdir(outDir, { recursive: true });

const standardSvg = await fs.readFile('public/icon.svg');
const maskableSvg = await fs.readFile('public/icon-maskable.svg');

const jobs = [
  { src: standardSvg, size: 180, name: 'apple-touch-icon.png' }, // iOS home-screen
  { src: standardSvg, size: 192, name: 'icon-192.png' },
  { src: standardSvg, size: 512, name: 'icon-512.png' },
  { src: maskableSvg, size: 192, name: 'icon-192-maskable.png' },
  { src: maskableSvg, size: 512, name: 'icon-512-maskable.png' },
  { src: standardSvg, size: 32,  name: 'favicon-32.png' },
];

for (const job of jobs) {
  const out = path.join(outDir, job.name);
  await sharp(job.src, { density: 384 }).resize(job.size, job.size).png().toFile(out);
  console.log(`wrote ${out}`);
}
