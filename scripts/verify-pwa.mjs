import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { once } from "node:events";

const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4187",
    "--strictPort",
  ],
  { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Preview did not start")),
      15000,
    );
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("4187")) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview exited: ${code}`));
    });
  });
  browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto("http://127.0.0.1:4187");
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === "activated");
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  for (const asset of [
    "manifest.webmanifest",
    "icon-192.png",
    "icon-512.png",
    "apple-touch-icon.png",
  ]) {
    const response = await context.request.get(
      `http://127.0.0.1:4187/${asset}`,
    );
    assert.equal(response.status(), 200, asset);
  }
  await page.getByRole("button", { name: "还不错", exact: true }).click();
  await page
    .getByRole("textbox", { name: "这一天的感受" })
    .fill("离线时，也能留下日常。");
  await context.setOffline(true);
  await page.reload();
  assert.equal(
    await page.getByRole("textbox", { name: "这一天的感受" }).inputValue(),
    "离线时，也能留下日常。",
  );
  assert.equal(
    await page
      .getByRole("button", { name: "还不错", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "我的回响", exact: true }).click();
  assert.equal(await page.locator("#share-canvas").count(), 1);
  console.log(
    "PASS: production assets, PWA service worker, offline reload, persistence, offline share canvas.",
  );
} finally {
  if (browser) await browser.close();
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
}
