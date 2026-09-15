import { chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch();
try {
  const svg = await readFile(
    new URL("../public/icon.svg", import.meta.url),
    "utf8",
  );
  for (const [size, name] of [
    [192, "icon-192.png"],
    [512, "icon-512.png"],
    [180, "apple-touch-icon.png"],
  ]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<body style="margin:0;background:#f7f8fa"><img width="${size}" height="${size}" src="data:image/svg+xml,${encodeURIComponent(svg)}"></body>`,
    );
    await page.locator("img").evaluate((img) => img.decode());
    await page.screenshot({
      path: fileURLToPath(new URL(`../public/${name}`, import.meta.url)),
    });
    await page.close();
  }
} finally {
  await browser.close();
}
