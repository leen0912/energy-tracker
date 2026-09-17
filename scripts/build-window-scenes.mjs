import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
const atlas = await readFile(new URL('../docs/concepts/window-garden-stages-v11.png',import.meta.url));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const scenes = await page.evaluate(async (source) => {
    const image = new Image(); image.src = source; await image.decode();
    // Measured panel bounds in the generated atlas, including the painted sill.
    const rows = [[0,396],[398,430],[832,429],[1263,511]];
    const results = [];
    rows.forEach(([y,h],stage) => [false,true].forEach((cat) => {
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 600;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,600,600);
      const w = 443, scale = Math.min(600/w,600/h), dw = w*scale, dh = h*scale;
      ctx.drawImage(image,cat ? 444 : 0,y,w,h,600-dw,600-dh,dw,dh);
      results.push({name:`window-${stage}${cat ? '-didi' : ''}.jpg`,url:canvas.toDataURL('image/jpeg',.91)});
    }));
    return results;
  },'data:image/png;base64,'+atlas.toString('base64'));
  for (const scene of scenes) {
    const bytes = Buffer.from(scene.url.split(',')[1],'base64');
    await writeFile(new URL('../miniprogram/assets/'+scene.name,import.meta.url),bytes);
    console.log(scene.name,bytes.length);
  }
} finally { await browser.close(); }
