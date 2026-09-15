import {
  CATEGORIES,
  ENERGY,
  entriesForDay,
  hasDay,
  key,
  monthDays,
  monthStats,
  recordedMinutes,
  hours,
  type Data,
} from "./model";
export type ShareOptions = {
  period: "month" | "day";
  theme: "light" | "dark";
  showNote: boolean;
  showTitles: boolean;
  showEnergy: boolean;
  demo: boolean;
};
const font = '"Microsoft YaHei", "PingFang SC", sans-serif';
function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function line(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  max: number,
  size: number,
  color: string,
  weight = 400,
) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  let text = value;
  while (ctx.measureText(text).width > max && text.length > 0)
    text = text.slice(0, -1);
  if (text !== value) text = text.slice(0, -1) + "…";
  ctx.fillText(text, x, y);
}
export function drawShare(
  canvas: HTMLCanvasElement,
  data: Data,
  date: Date,
  options: ShareOptions,
) {
  canvas.width = 1080;
  canvas.height = 1440;
  const ctx = canvas.getContext("2d")!;
  const dark = options.theme === "dark",
    bg = dark ? "#202c2a" : "#f7f8f5",
    ink = dark ? "#f0f4ec" : "#24362f",
    muted = dark ? "#b0bbb3" : "#667a70",
    rule = dark ? "#41514b" : "#d4ddd5";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1440);
  line(ctx, "日迹  /  DAY TRACE", 76, 90, 700, 25, ink, 600);
  ctx.textAlign = "right";
  line(ctx, options.demo ? "示例生活" : "生活的回响", 1004, 90, 250, 22, muted);
  ctx.textAlign = "left";
  ctx.fillStyle = rule;
  ctx.fillRect(76, 128, 928, 1);
  const monthly = options.period === "month";
  line(
    ctx,
    `${date.getFullYear()}  /  ${monthly ? "MONTHLY NOTES" : "DAILY NOTES"}`,
    76,
    198,
    700,
    22,
    muted,
  );
  ctx.font = "400 154px Georgia, serif";
  ctx.fillStyle = ink;
  ctx.fillText(
    String(monthly ? date.getMonth() + 1 : date.getDate()).padStart(2, "0"),
    66,
    357,
  );
  line(
    ctx,
    monthly ? "每一天，都有迹可循。" : "今天，也值得被收藏。",
    298,
    302,
    706,
    40,
    ink,
    500,
  );
  line(
    ctx,
    monthly
      ? "忙碌有它的形状，留白也有。"
      : `${date.getMonth() + 1} 月 ${date.getDate()} 日 · 给生活一点回响`,
    300,
    352,
    704,
    23,
    muted,
  );
  if (monthly) {
    const days = monthDays(date),
      offset = (days[0].getDay() + 6) % 7,
      cell = 118,
      gap = 17,
      originY = 464;
    ["一", "二", "三", "四", "五", "六", "日"].forEach((d, i) =>
      line(ctx, d, 76 + i * (cell + gap) + 42, 432, 100, 21, muted),
    );
    for (const d of days) {
      const i = offset + d.getDate() - 1,
        x = 76 + (i % 7) * (cell + gap),
        y = originY + Math.floor(i / 7) * 100,
        k = key(d),
        entries = entriesForDay(data, k);
      rounded(ctx, x, y, cell, 84, 9, dark ? "#2c3c36" : "#e9eee8");
      if (hasDay(data, k)) {
        const cats = [...new Set(entries.map((e) => e.category))];
        if (!cats.length) cats.push("rest");
        const stripeWidth = (cell - 12) / cats.length;
        cats.forEach((c, n) =>
          rounded(
            ctx,
            x + 6 + n * stripeWidth,
            y + 44,
            stripeWidth - 3,
            30,
            3,
            CATEGORIES[c].color,
          ),
        );
      }
      line(
        ctx,
        String(d.getDate()).padStart(2, "0"),
        x + 12,
        y + 29,
        70,
        22,
        ink,
      );
      if (options.showEnergy && data.days[k]?.energy) {
        ctx.beginPath();
        ctx.arc(x + 101, y + 22, 4, 0, Math.PI * 2);
        ctx.fillStyle =
          data.days[k].energy === "low"
            ? "#d99688"
            : data.days[k].energy === "high"
              ? "#5c9d7e"
              : muted;
        ctx.fill();
      }
    }
    Object.values(CATEGORIES).forEach((category, i) => {
      const x = 76 + i * 156;
      rounded(ctx, x, 1074, 13, 13, 3, category.color);
      line(ctx, category.label, x + 23, 1089, 110, 18, muted);
    });
    const stats = monthStats(data, date);
    line(
      ctx,
      String(stats.count).padStart(2, "0"),
      76,
      1184,
      240,
      64,
      ink,
      500,
    );
    line(ctx, "留下痕迹的日子", 76, 1228, 280, 23, muted);
    line(ctx, hours(stats.minutes), 418, 1184, 570, 46, ink, 500);
    line(ctx, "已记录的时间", 420, 1228, 500, 23, muted);
  } else {
    const k = key(date),
      entries = entriesForDay(data, k),
      total = recordedMinutes(entries, k);
    const cats = Object.entries(CATEGORIES).map(([id, c]) => ({
      id,
      ...c,
      count: entries.filter((e) => e.category === id).length,
    }));
    let x = 76;
    const size = entries.length ? 928 / entries.length : 928;
    if (!entries.length) rounded(ctx, 76, 440, 928, 220, 8, rule);
    entries.forEach((e) => {
      rounded(
        ctx,
        x,
        440,
        Math.max(2, size - 6),
        220,
        6,
        CATEGORIES[e.category].color,
      );
      x += size;
    });
    let labelX = 76;
    cats
      .filter((c) => c.count)
      .forEach((c) => {
        rounded(ctx, labelX, 704, 14, 14, 3, c.color);
        line(ctx, c.label, labelX + 24, 720, 120, 22, muted);
        labelX += 149;
      });
    line(ctx, hours(total), 76, 830, 880, 66, ink, 500);
    line(
      ctx,
      `${entries.length} 段日常${options.showEnergy && data.days[k]?.energy ? "  ·  " + ENERGY[data.days[k].energy!] : ""}`,
      76,
      884,
      900,
      25,
      muted,
    );
    let y = 984;
    if (options.showTitles)
      entries.slice(0, 3).forEach((e) => {
        line(ctx, e.title, 76, y, 928, 27, ink);
        y += 49;
      });
    if (options.showNote && data.days[k]?.note)
      line(ctx, data.days[k].note!, 76, 1184, 928, 27, ink);
    else line(ctx, "留白的地方，也是生活。", 76, 1184, 928, 30, ink);
  }
  ctx.fillStyle = rule;
  ctx.fillRect(76, 1300, 928, 1);
  line(ctx, "收藏时间，也收藏自己。", 76, 1355, 800, 23, muted);
  [
    CATEGORIES.work.color,
    CATEGORIES.rest.color,
    CATEGORIES.life.color,
    CATEGORIES.people.color,
  ].forEach((c, i) => rounded(ctx, 898 + i * 29, 1334, 20, 20, 4, c));
}
export async function canvasFile(canvas: HTMLCanvasElement, name: string) {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("图片生成失败，请再试一次。"))),
      "image/png",
    ),
  );
  return new File([blob], name, { type: "image/png" });
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
