import { chromium } from "@playwright/test";
import { mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  Battery,
  Cat,
  Moon,
  Plus,
  Minus,
  CalendarDays,
  Sparkles,
  SlidersHorizontal,
  Utensils,
  Leaf,
  BriefcaseBusiness,
  Users,
  CloudLightning,
  Play,
  ChevronLeft,
  ChevronRight,
  Download,
  Settings2,
  X,
  Coffee, CupSoda, Pill, TrainFront, CloudRain, Sun, House, Pencil, Undo2, Check, Expand, Clock, Sprout,
} from "lucide";

const folder = new URL("../miniprogram/assets/", import.meta.url);
await mkdir(folder, { recursive: true });
await copyFile(
  new URL("../node_modules/lucide/LICENSE", import.meta.url),
  new URL("LUCIDE-LICENSE.txt", folder),
);
const icons = {
  battery: Battery,
  cat: Cat,
  moon: Moon,
  plus: Plus,
  minus: Minus,
  calendar: CalendarDays,
  sparkles: Sparkles,
  sliders: SlidersHorizontal,
  utensils: Utensils,
  leaf: Leaf,
  briefcase: BriefcaseBusiness,
  users: Users,
  cloud: CloudLightning,
  play: Play,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  download: Download,
  settings: Settings2,
  x: X,
  coffee: Coffee, cup: CupSoda, pill: Pill, train: TrainFront, rain: CloudRain, sun: Sun, house: House,
  pencil: Pencil, undo: Undo2, check: Check, expand: Expand, clock: Clock, sprout: Sprout,
};
const variants = Object.entries(icons).map(([name, nodes]) => ({
  name,
  nodes,
  color: ["minus", "cloud", "users", "briefcase"].includes(name)
    ? "#cb8272"
    : ["moon", "utensils"].includes(name)
      ? "#c6a358"
      : [
            "battery",
            "calendar",
            "sparkles",
            "settings",
            "x",
            "chevron-left",
            "chevron-right",
          ].includes(name)
        ? "#8b9a92"
        : "#32876a",
}));
variants.forEach((variant) => { variant.color = '#202526'; });
for (const name of ["battery", "calendar", "sparkles"])
  variants.push({
    name: name + "-active",
    nodes: icons[name],
    color: "#202526",
  });
variants.push({ name: "download-white", nodes: Download, color: "#ffffff" });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 96, height: 96 },
    deviceScaleFactor: 1,
  });
  for (const { name, nodes, color } of variants) {
    const body = nodes
      .map(
        ([tag, attrs]) =>
          `<${tag} ${Object.entries(attrs)
            .map(([k, v]) => `${k}="${v}"`)
            .join(" ")}/>`,
      )
      .join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg}</body></html>`,
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`${name}.png`, folder)),
      omitBackground: true,
    });
  }
  console.log(`Generated ${variants.length} mini-program icons from Lucide.`);
} finally {
  await browser.close();
}
