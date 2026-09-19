import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const template of ['peony', 'iris', 'tulip']) {
    const atlas = await readFile(new URL(`../docs/concepts/garden-${template}-v12.png`, import.meta.url));
    const scenes = await page.evaluate(async (source) => {
      const image = new Image(); image.src = source; await image.decode();
      const results = [];
      for (let stage = 0; stage < 4; stage++) for (const cat of [false, true]) {
        const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 600, 600);
        const x = Math.round(image.width * (cat ? .5 : 0));
        const y = Math.round(image.height * stage / 4);
        const w = Math.round(image.width * (cat ? 1 : .5)) - x;
        const h = Math.round(image.height * (stage + 1) / 4) - y;
        // Contain at a fixed size: preserve paws and reserve the live text column.
        const scale = Math.min(468 / w, 468 / h), dw = w * scale, dh = h * scale;
        ctx.drawImage(image, x, y, w, h, 600 - dw, 600 - dh, dw, dh);
        results.push({ stage, cat, url: canvas.toDataURL('image/jpeg', .85) });
      }
      return results;
    }, 'data:image/png;base64,' + atlas.toString('base64'));
    for (const scene of scenes) {
      const name = `${template}-${scene.stage}${scene.cat ? '-didi' : ''}.jpg`;
      const bytes = Buffer.from(scene.url.split(',')[1], 'base64');
      await writeFile(new URL('../miniprogram/assets/' + name, import.meta.url), bytes);
      console.log(name, bytes.length);
    }
  }
} finally { await browser.close(); }
