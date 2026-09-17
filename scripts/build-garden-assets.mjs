import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const source = process.argv[2];
if (!source) throw new Error('Pass the generated production atlas path.');
const folder = new URL('../miniprogram/assets/', import.meta.url);
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const data = await readFile(source);
  const assets = await page.evaluate(async (data) => {
    const img = new Image();
    img.src = data;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
    const areas = [
      ['flower-red', 20, 4, 476, 504], ['flower-blue', 545, 4, 463, 504],
      ['flower-yellow', 1080, 4, 437, 498], ['leaf-stem', 25, 523, 425, 486],
    ];
    return { alpha, files: areas.map(([name, x, y, w, h]) => {
      const c = document.createElement('canvas');
      c.width = 96; c.height = Math.round(96 * h / w);
      c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
      return { name, url: c.toDataURL('image/png'), width: c.width, height: c.height };
    }) };
  }, `data:image/png;base64,${data.toString('base64')}`);
  console.log('Atlas corner alpha:', assets.alpha);
  for (const file of assets.files) {
    await writeFile(new URL(`${file.name}.png`, folder), Buffer.from(file.url.split(',')[1], 'base64'));
    console.log(file.name, file.width, file.height);
  }
} finally { await browser.close(); }
