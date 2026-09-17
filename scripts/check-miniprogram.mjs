import { readFile, readdir, mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../miniprogram/", import.meta.url));
async function walk(dir) {
  const all = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) all.push(...(await walk(p)));
    else all.push(p);
  }
  return all;
}
const files = await walk(root);
let total = 0;
for (const file of files) {
  total += (await stat(file)).size;
  if (file.endsWith(".json")) JSON.parse(await readFile(file, "utf8"));
  if (file.endsWith(".js"))
    new vm.Script(await readFile(file, "utf8"), { filename: file });
}
const app = JSON.parse(await readFile(path.join(root, "app.json"), "utf8"));
for (const route of app.pages) {
  for (const ext of [".js", ".json", ".wxml", ".wxss"])
    await stat(path.join(root, route + ext));
}
const cli =
  process.env.WECHAT_DEVTOOLS_CLI || "D:/WC_devtools/微信web开发者工具/cli.bat";
const compilerDir = path.join(
  path.dirname(cli),
  "resources/app.asar.unpacked/node_modules/wcc-exec",
);
const out = fileURLToPath(new URL("../.local/wechat/", import.meta.url));
await mkdir(out, { recursive: true });
for (const [exe, input, dest] of [
  ["wcc.exe", ["pages/index/index.wxml"], "compiled-wxml.js"],
  ["wcsc.exe", ["app.wxss", "pages/index/index.wxss"], "compiled-wxss.js"],
]) {
  const result = spawnSync(
    path.join(compilerDir, exe),
    ["-o", path.join(out, dest), ...input],
    { cwd: root, encoding: "utf8", windowsHide: true },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${exe} failed:\n${result.stderr}\n${result.stdout}`);
  if (result.stderr) console.log(result.stderr.trim());
  console.log(`PASS: ${exe} compiled ${input.join(", ")}`);
}
console.log(
  `PASS: ${files.length} files, JSON/JavaScript/routes valid, ${(total / 1024).toFixed(1)} KiB before platform packaging.`,
);
