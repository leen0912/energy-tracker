import {
  createIcons,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  BatteryMedium,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Download,
  Footprints,
  Heart,
  Leaf,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Settings2,
  Share2,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  BriefcaseBusiness,
  Ellipsis,
  Pencil,
  Utensils,
  Undo2,
} from "lucide";
import { registerSW } from "virtual:pwa-register";
import {
  CATEGORIES,
  ENERGY,
  demoData,
  emptyData,
  entriesForDay,
  hasDay,
  hours,
  key,
  monthDays,
  monthLabel,
  monthStats,
  parseDay,
  recordedMinutes,
  shiftDay,
  timeLabel,
  type Category,
  type Data,
  type Day,
  type Energy,
  type Entry,
} from "./model";
import {
  loadData,
  mergeData,
  rawBackup,
  saveData,
  validateData,
} from "./storage";
import { parseCalendar, type ImportResult } from "./calendar";
import { canvasFile, download, drawShare, type ShareOptions } from "./share";
import "./styles.css";

const iconSet = {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  BatteryMedium,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Download,
  Footprints,
  Heart,
  Leaf,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Settings2,
  Share2,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
  BriefcaseBusiness,
  Ellipsis,
  Pencil,
  Utensils,
  Undo2,
};
const $ = <T extends Element = HTMLElement>(
  s: string,
  parent: ParentNode = document,
) => parent.querySelector<T>(s)!;
const app = $("#app"),
  dialog = $<HTMLDialogElement>("#dialog");
const initial = loadData();
let own = initial.data,
  storageError = initial.error;
let today = new Date(),
  selected = key(today),
  month = new Date(today.getFullYear(), today.getMonth(), 1),
  demo = false;
let sample = demoData(today),
  view: "calendar" | "share" | "settings" = "calendar",
  toastTimer: ReturnType<typeof setTimeout>,
  importResult: ImportResult | undefined;
let options: ShareOptions = {
  period: "month",
  theme: "light",
  showNote: false,
  showTitles: false,
  showEnergy: false,
  demo: false,
};
const data = () => (demo ? sample : own);
const icon = (name: string) =>
  `<i data-lucide="${name}" aria-hidden="true"></i>`;
const escape = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const button = (
  action: string,
  label: string,
  name: string,
  cls = "icon-button",
  extra = "",
) =>
  `<button type="button" class="${cls}" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(name)}${cls === "icon-button" ? "" : `<span>${label}</span>`}</button>`;
const hydrate = () =>
  createIcons({ icons: iconSet, attrs: { "stroke-width": 1.7 } });
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4000);
}
function commit(next: Data, redraw = true) {
  if (demo) {
    sample = next;
    if (redraw) render();
    return true;
  }
  if (storageError) {
    toast(storageError);
    return false;
  }
  try {
    saveData(next);
    own = next;
    if (redraw) render();
    return true;
  } catch {
    toast("没有保存成功。设备存储空间可能不足，请先导出备份。");
    return false;
  }
}
function updateDay(change: Partial<Day>, redraw = true) {
  return commit(
    {
      ...data(),
      days: {
        ...data().days,
        [selected]: { ...data().days[selected], ...change },
      },
    },
    redraw,
  );
}
function openDialog(html: string) {
  dialog.innerHTML = `<div class="dialog-top">${button("close", "关闭", "x")}</div>${html}`;
  hydrate();
  if (!dialog.open) dialog.showModal();
}
function closeDialog() {
  dialog.close();
  importResult = undefined;
}
function setMonth(delta: number) {
  month = new Date(month.getFullYear(), month.getMonth() + delta, 1);
  selected = key(
    new Date(
      month.getFullYear(),
      month.getMonth(),
      Math.min(parseDay(selected).getDate(), monthDays(month).length),
    ),
  );
  render();
}

function render() {
  const stats = monthStats(data(), month);
  app.innerHTML = `
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="日迹首页"><img src="/icon.svg" alt="" width="38" height="38"><span>日迹<small>DAY TRACE</small></span></a>
      <nav aria-label="主导航">${[
        ["calendar", "calendar-days", "生活日历"],
        ["share", "sparkles", "我的回响"],
        ["settings", "settings-2", "记录与设置"],
      ]
        .map(
          ([id, i, label]) =>
            `<button class="nav-item ${view === id ? "active" : ""}" data-view="${id}" ${view === id ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span>${id === "share" ? '<span class="nav-dot"></span>' : ""}</button>`,
        )
        .join("")}</nav>
      <div class="sidebar-bottom"><div class="little-mark">${icon("leaf")}</div><p>忙碌有它的形状，<br>留白也有。</p><span class="local-status"><b></b>${demo ? "正在浏览示例" : "记录保存在本机"}</span></div>
    </aside>
    <div class="workspace">
      <header class="topbar"><div class="breadcrumb">日迹 <span>/</span> <strong>${view === "calendar" ? "生活日历" : view === "share" ? "我的回响" : "记录与设置"}</strong></div><div class="top-actions">${button("demo", demo ? "回到我的日历" : "看看示例", "sparkles", "text-button")}${button("import", "导入日历", "upload", "secondary-button")}<span class="avatar" aria-label="我的空间">我</span></div></header>
      ${demo ? `<div class="demo-banner"><span>示例模式 · 这是一段虚构的生活，可以随意体验。</span><button data-action="demo">开始我的记录 ${icon("arrow-up-right")}</button></div>` : ""}
      ${storageError ? `<div class="error-banner" role="alert">${escape(storageError)}</div>` : ""}
      <main>${view === "calendar" ? calendarView(stats) : view === "share" ? shareView() : settingsView()}</main>
      <footer class="page-footer"><span>日迹 · 生活的回响</span><span>每一页，都是你自己的节奏。</span></footer>
    </div>`;
  hydrate();
  $(".brand").addEventListener("click", (e) => {
    e.preventDefault();
    view = "calendar";
    render();
  });
  if (view === "calendar") {
    drawShare($<HTMLCanvasElement>("#mini-share"), data(), month, {
      ...options,
      period: "month",
      demo,
    });
    $("#note").addEventListener("input", (e) => {
      if (updateDay({ note: (e.target as HTMLTextAreaElement).value }, false))
        $(".note-footer>span").textContent = "已留下这一刻";
    });
    $("#note-form").addEventListener("submit", (e) => {
      e.preventDefault();
      if (updateDay({ note: $<HTMLTextAreaElement>("#note").value.trim() }))
        toast(demo ? "已记在示例日历中" : "这一刻，留下了。");
    });
  }
  if (view === "share") drawCurrentShare();
}
function calendarView(stats: ReturnType<typeof monthStats>) {
  const days = monthDays(month),
    offset = (days[0].getDay() + 6) % 7,
    cellCount = Math.ceil((offset + days.length) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, i) => {
    const date = new Date(
        month.getFullYear(),
        month.getMonth(),
        i - offset + 1,
      ),
      k = key(date),
      outside = date.getMonth() !== month.getMonth(),
      entries = entriesForDay(data(), k),
      day = data().days[k],
      cats = [...new Set(entries.map((e) => e.category))];
    const filled = hasDay(data(), k);
    return `<button class="day-cell ${outside ? "outside" : ""} ${k === selected ? "selected" : ""} ${k === key(today) ? "today" : ""} ${filled ? "filled" : ""}" data-day="${k}" aria-label="${k}${filled ? `，${entries.length} 段日常` : ""}${day?.energy ? `，${ENERGY[day.energy]}` : ""}" aria-pressed="${k === selected}"><span class="day-number">${date.getDate()}</span>${day?.energy ? `<span class="energy-dot ${day.energy}" title="${ENERGY[day.energy]}"></span>` : ""}<span class="day-colors">${cats
      .slice(0, 4)
      .map((c) => `<b style="--category:${CATEGORIES[c].color}"></b>`)
      .join(
        "",
      )}${!cats.length && filled ? '<b class="note-color"></b>' : ""}</span><span class="day-caption">${entries.length ? `${entries.length} 段日常` : filled ? "一刻心情" : ""}</span></button>`;
  }).join("");
  return `<section class="page-heading"><div><div class="eyebrow">YOUR DAYS, IN COLOR</div><h1>生活，有迹可循<span class="heading-dot">。</span></h1><p>把平常的日子，翻成值得收藏的一页。</p></div>${button("add", "记一笔", "plus", "primary-button")}</section>
    <div class="calendar-layout"><section class="calendar-main">
      <div class="month-toolbar"><div class="month-name"><h2>${monthLabel(month)}</h2><span>${["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"][month.getMonth()]}</span></div><div class="month-controls">${button("prev", "上个月", "chevron-left")}<button class="today-button" data-action="today">今天</button>${button("next", "下个月", "chevron-right")}</div></div>
      <div class="weekdays">${["一", "二", "三", "四", "五", "六", "日"].map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="calendar-grid">${cells}</div>
      <div class="calendar-legend">${Object.values(CATEGORIES)
        .map(
          (c) => `<span><b style="background:${c.color}"></b>${c.label}</span>`,
        )
        .join("")}<span class="energy-legend"><b></b>当天感受</span></div>
      <div class="month-summary"><div><span>留下痕迹</span><strong>${stats.count}<small>天</small></strong></div><div><span>已记录时间</span><strong>${Math.floor(stats.minutes / 60)}<small>小时</small>${stats.minutes % 60 ? `<em>${stats.minutes % 60} 分</em>` : ""}</strong></div><div><span>想歇一歇的日子</span><strong>${stats.low}<small>天</small></strong></div></div>
      ${!stats.count ? `<div class="empty-month">${icon("leaf")}<div><strong>这页日历，等你的第一笔。</strong><p>今天的一点感受，也算数。</p></div><button data-action="import" class="text-button">导入日历 ${icon("arrow-up-right")}</button></div>` : ""}
      <section class="echo-teaser"><div class="echo-text"><span class="eyebrow">A LITTLE LOOK BACK</span><h2>平常的日子，<br>也值得被收藏。</h2><p>${stats.count ? `这个月，已经留下 ${stats.count} 天的痕迹。` : "从第一天开始，慢慢收集生活。"}</p><button class="text-button" data-view="share">看看本月回响 ${icon("arrow-up-right")}</button></div><button class="mini-share-button" data-view="share" aria-label="查看本月分享图"><canvas id="mini-share" aria-label="本月生活分享图预览"></canvas></button></section>
    </section><aside class="day-panel">${dayView()}</aside></div>`;
}
function dayView() {
  const date = parseDay(selected),
    entries = entriesForDay(data(), selected),
    day = data().days[selected] || {},
    isToday = selected === key(today),
    future = selected > key(today);
  const total = recordedMinutes(entries, selected);
  return `<div class="day-heading"><div><span class="eyebrow">${isToday ? "TODAY" : "DAY NOTES"}</span><h2>${date.getMonth() + 1} 月 ${date.getDate()} 日 <small>${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()]}</small></h2></div><span class="date-stamp">${String(date.getDate()).padStart(2, "0")}</span></div>
    <section class="energy-section"><h3>${icon("battery-medium")} ${isToday ? "今天感觉怎么样？" : "这一天的感受"} <span>凭感觉就好</span></h3><div class="energy-options" role="group" aria-label="精力状态">${(["low", "mid", "high"] as Energy[]).map((e, i) => `<button data-energy="${e}" class="${day.energy === e ? "chosen" : ""}" aria-pressed="${day.energy === e}" ${future ? "disabled" : ""}>${icon(["moon", "leaf", "sun"][i])}<span>${ENERGY[e]}</span></button>`).join("")}</div></section>
    <section class="daily-care"><div class="section-label"><h3>照顾自己</h3>${icon("heart")}</div><div class="care-row"><span>${icon("moon")}睡眠</span><div class="small-segments">${[
      ["less", "有点少"],
      ["okay", "一般"],
      ["enough", "睡够了"],
    ]
      .map(
        ([v, l]) =>
          `<button data-sleep="${v}" class="${day.sleep === v ? "chosen" : ""}" aria-pressed="${day.sleep === v}" ${future ? "disabled" : ""}>${l}</button>`,
      )
      .join(
        "",
      )}</div></div><div class="care-row"><span>${icon("utensils")}吃饭</span><div class="meal-options">${["早餐", "午餐", "晚餐"].map((m) => `<button data-meal="${m}" class="${day.meals?.includes(m) ? "chosen" : ""}" aria-pressed="${!!day.meals?.includes(m)}" ${future ? "disabled" : ""}>${day.meals?.includes(m) ? icon("check") : ""}${m}</button>`).join("")}</div></div><div class="care-row"><span>${icon("coffee")}咖啡</span><div class="coffee-controls"><span>${day.coffees?.length ? `${day.coffees.length} 杯${isToday ? " · 最近 " + day.coffees.at(-1) : ""}` : "还没记录"}</span>${day.coffees?.length ? button("undo-coffee", "撤销一杯", "undo-2") : ""}${button("coffee", "记一杯", "plus", "icon-button", future ? "disabled" : "")}</div></div>${isToday ? `<p class="care-hint">${careHint(day)}</p>` : ""}</section>
    <section class="note-section"><h3>${icon("message-circle")} 留一句给自己</h3><form id="note-form"><textarea id="note" maxlength="1000" rows="3" placeholder="此刻的心情，或一个想记住的瞬间…" aria-label="这一天的感受" ${future ? "disabled" : ""}>${escape(day.note || "")}</textarea><div class="note-footer"><span>${day.note ? "已留下这一刻" : "只留给自己"}</span><button class="text-button" type="submit" ${future ? "disabled" : ""}>${icon("check")}留下</button></div></form></section>
    <section class="timeline-section"><div class="section-label"><h3>这一天的片段 <span>${entries.length}</span></h3>${button("add", "添加片段", "plus")}</div>${entries.length ? `<div class="timeline">${entries.map((e) => `<button class="timeline-entry" data-edit="${escape(e.id)}"><span class="timeline-icon" style="--category:${CATEGORIES[e.category].color};--pale:${CATEGORIES[e.category].pale}">${icon(CATEGORIES[e.category].icon)}</span><span class="timeline-info"><strong>${escape(e.title)}</strong><small>${e.allDay ? "全天" : `${key(new Date(e.start)) !== selected ? "前一天 " : ""}${timeLabel(e.start)} — ${key(new Date(e.end)) !== selected ? "次日 " : ""}${timeLabel(e.end)}`} · ${CATEGORIES[e.category].label}${e.source === "calendar" ? " · 日历" : ""}</small></span>${icon("chevron-right")}</button>`).join("")}</div><div class="timeline-total">已记录 <strong>${hours(total)}</strong></div>` : `<div class="timeline-empty"><span class="empty-line"></span><p>还没有时间片段</p><button class="text-button" data-action="add">${icon("plus")}记下一段日常</button></div>`}</section>`;
}
function careHint(day: Day) {
  const hour = new Date().getHours();
  if (day.energy === "low") return "今天的节奏，可以慢一点。";
  if (hour >= 18 && !day.meals?.includes("晚餐"))
    return "到饭点了，给晚餐留一点时间。";
  if (hour >= 12 && hour < 18 && !day.meals?.includes("午餐"))
    return "忙碌之间，也给午饭留个位置。";
  return "愿今天，也有留给自己的时间。";
}
function shareView() {
  const daily = options.period === "day";
  return `<section class="page-heading"><div><div class="eyebrow">YOUR LITTLE COLLECTION</div><h1>生活的回响<span class="heading-dot">。</span></h1><p>原来，已经走过了这么多日子。</p></div></section><div class="share-layout"><section class="share-stage"><canvas id="share-canvas" aria-label="可保存的生活总结图"></canvas></section><aside class="share-controls"><h2>收藏这一页</h2><div class="field"><label>时间</label><div class="segments">${[
    ["month", "这个月"],
    ["day", "这一天"],
  ]
    .map(
      ([v, l]) =>
        `<button data-period="${v}" class="${options.period === v ? "chosen" : ""}" aria-pressed="${options.period === v}">${l}</button>`,
    )
    .join(
      "",
    )}</div></div><div class="share-date">${button(daily ? "day-prev" : "prev", "上一页", "chevron-left")}<strong>${daily ? selected : monthLabel(month)}</strong>${button(daily ? "day-next" : "next", "下一页", "chevron-right")}</div><div class="field"><label>纸张</label><div class="swatches"><button class="swatch light ${options.theme === "light" ? "selected" : ""}" aria-label="浅色纸张" title="浅色纸张" data-theme="light">${options.theme === "light" ? icon("check") : ""}</button><button class="swatch dark ${options.theme === "dark" ? "selected" : ""}" aria-label="深色纸张" title="深色纸张" data-theme="dark">${options.theme === "dark" ? icon("check") : ""}</button><span>${options.theme === "light" ? "晨间 · 浅色" : "夜晚 · 深色"}</span></div></div><div class="privacy-options"><h3>分享时显示</h3><label><span>当天感受</span><input type="checkbox" data-option="showEnergy" ${options.showEnergy ? "checked" : ""}></label>${daily ? `<label><span>日程标题</span><input type="checkbox" data-option="showTitles" ${options.showTitles ? "checked" : ""}></label><label><span>心情原文</span><input type="checkbox" data-option="showNote" ${options.showNote ? "checked" : ""}></label>` : ""}</div><button class="primary-button full" data-action="download">${icon("download")}保存图片</button><button class="secondary-button full" data-action="share">${icon("share-2")}分享这一页</button><p class="privacy-caption">${icon("heart")} ${daily && (options.showNote || options.showTitles) ? "图片会包含你选择公开的内容。" : "日程标题与心情原文不会出现在图片中。"}</p></aside></div>`;
}
function settingsView() {
  return `<section class="page-heading"><div><div class="eyebrow">YOUR OWN SPACE</div><h1>给记录一个家<span class="heading-dot">。</span></h1><p>时间由你安排，记录也由你掌握。</p></div></section><div class="settings-list"><section><h2>我的日历</h2><div class="setting-row"><div><h3>从日历带来生活</h3><p>导入 .ics 文件，在确认后归入日历。再次导入会更新相同日程。</p></div>${button("import", "导入日历", "upload", "secondary-button")}</div><p class="setting-note">当前为文件导入，尚未连接 Apple、Google 或 Windows 日历的自动同步。</p></section><section><h2>数据与备份</h2><div class="setting-row"><div><h3>保存在这台设备</h3><p>共 ${own.entries.length} 段日常。换设备或清理浏览器前，请先备份。</p></div>${button("backup", "导出备份", "arrow-down-to-line", "secondary-button")}</div><div class="setting-row"><div><h3>带回之前的记录</h3><p>合并日迹备份，重复日程和同日感受保留当前版本。</p></div>${button("restore", "恢复备份", "arrow-up-from-line", "secondary-button")}</div>${storageError ? `<div class="setting-row"><div><h3>恢复无法读取的本机记录</h3><p>先导出原始备份，再导入有效备份替换损坏数据。</p></div>${button("repair", "修复本机数据", "undo-2", "secondary-button")}</div>` : ""}</section><section><h2>随身使用</h2><div class="setting-row"><div><h3>iPhone 主屏幕</h3><p>正式网址在 Safari 打开后，可从分享菜单添加到主屏幕。</p></div>${icon("arrow-up-right")}</div><div class="setting-row"><div><h3>温柔的提醒</h3><p>目前只在页面内提示饭点。锁屏提醒、Apple Watch 与健康数据接入正在规划中。</p></div>${icon("heart")}</div></section><section><h2>关于日迹</h2><p class="about-copy">最初，我们想要一个番茄钟。后来发现，真正想收藏的，是自己认真生活的痕迹。</p><span class="version">第一版 · 0.1.0</span></section></div>`;
}
function drawCurrentShare() {
  drawShare(
    $<HTMLCanvasElement>("#share-canvas"),
    data(),
    options.period === "month" ? month : parseDay(selected),
    { ...options, demo },
  );
}
const localInput = (value: Date) =>
  `${key(value)}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
function entryDialog(id?: string) {
  const entry = data().entries.find((e) => e.id === id),
    date = parseDay(selected);
  date.setHours(new Date().getHours(), 0, 0, 0);
  const start = entry ? new Date(entry.start) : date,
    end = entry ? new Date(entry.end) : new Date(+date + 3600000);
  openDialog(
    `<h2>${entry ? "这一段日常" : "记一段日常"}</h2><form id="entry-form"><div class="field"><label for="entry-title">发生了什么</label><input id="entry-title" name="title" maxlength="200" placeholder="比如，和梁姐散了个步" required value="${escape(entry?.title || "")}" autofocus></div><div class="field"><label for="entry-category">归在哪一页</label><select id="entry-category" name="category">${Object.entries(
      CATEGORIES,
    )
      .map(
        ([v, c]) =>
          `<option value="${v}" ${(entry?.category || "life") === v ? "selected" : ""}>${c.label}</option>`,
      )
      .join(
        "",
      )}</select></div><label class="checkbox-label"><input id="entry-allday" type="checkbox" name="allDay" ${entry?.allDay ? "checked" : ""}>全天事项（不计算时长）</label><div class="form-pair"><div class="field"><label for="entry-start">开始</label><input id="entry-start" name="start" type="datetime-local" required value="${localInput(start)}"></div><div class="field"><label for="entry-end">结束${entry?.allDay ? "（不含）" : ""}</label><input id="entry-end" name="end" type="datetime-local" required value="${localInput(end)}"></div></div><p id="entry-error" class="form-error" role="alert"></p><div class="dialog-actions">${entry ? button("delete", "删除这一段", "trash-2", "danger-button", `data-id="${escape(entry.id)}"`) : "<span></span>"}<button class="primary-button" type="submit">${icon("check")}留下这一段</button></div></form>`,
  );
  $("#entry-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = new FormData(e.target as HTMLFormElement),
      title = String(fields.get("title")).trim(),
      a = new Date(String(fields.get("start"))),
      b = new Date(String(fields.get("end"))),
      allDay = fields.has("allDay");
    if (allDay) {
      a.setHours(0, 0, 0, 0);
      b.setHours(0, 0, 0, 0);
      if (+b === +a) b.setDate(b.getDate() + 1);
    }
    if (!title || !Number.isFinite(+a) || !Number.isFinite(+b) || b <= a) {
      $("#entry-error").textContent = "请填写标题，并让结束时间晚于开始时间。";
      return;
    }
    const next: Entry = {
      id:
        entry?.id ||
        (crypto.randomUUID?.() ??
          Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join("")),
      title,
      category: String(fields.get("category")) as Category,
      start: a.toISOString(),
      end: b.toISOString(),
      allDay,
      source: entry?.source || "manual",
    };
    const nextData = {
      ...data(),
      entries: [...data().entries.filter((e) => e.id !== next.id), next],
    };
    if (commit(nextData, false)) {
      selected = key(a);
      month = new Date(a.getFullYear(), a.getMonth(), 1);
      closeDialog();
      render();
      toast(demo ? "已记在示例日历中" : "这一段日常，留下了。");
    }
  });
}
function importDialog() {
  if (demo) {
    toast("请先回到我的日历，再导入真实记录。");
    return;
  }
  openDialog(
    `<h2>把日历带过来</h2><p class="dialog-description">选择从日历导出的 .ics 文件，先看看，再归档。</p><label class="file-drop">${icon("calendar-days")}<strong>选择日历文件</strong><span>.ics · 最大 5 MB</span><input id="ics-file" type="file" accept=".ics,text/calendar"></label><p class="dialog-description">日历安排会保留为时间片段，不代表实际完成。文件只在当前设备处理。</p><p id="import-error" class="form-error" role="alert"></p>`,
  );
  $("#ics-file").addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("文件超过 5 MB，请导出较短时间范围。");
      const result = parseCalendar(await file.text());
      importResult = result;
      const existing = new Map(own.entries.map((e) => [e.id, e]));
      result.entries = result.entries.map((e) => ({
        ...e,
        category: existing.get(e.id)?.category || e.category,
      }));
      const updates = result.entries.filter((e) => existing.has(e.id)).length;
      openDialog(
        `<h2>这些日子，即将留下</h2><p class="dialog-description">${result.entries.length - updates} 段新日常 · ${updates} 段更新<br>范围：${key(result.from)} 至 ${key(shiftDay(result.to, -1))}</p>${result.skipped ? `<p class="import-warning">已跳过 ${result.skipped} 段取消或无法读取的日程。</p>` : ""}${result.warnings.map((w) => `<p class="import-warning">${escape(w)}</p>`).join("")}<div class="import-preview">${
          result.entries
            .slice(0, 100)
            .map(
              (e, i) =>
                `<div><span><strong>${escape(e.title)}</strong><small>${key(new Date(e.start))} · ${e.allDay ? "全天" : timeLabel(e.start)}</small></span><select data-import-category="${i}" aria-label="${escape(e.title)}的分类">${Object.entries(
                  CATEGORIES,
                )
                  .map(
                    ([k, c]) =>
                      `<option value="${k}" ${e.category === k ? "selected" : ""}>${c.label}</option>`,
                  )
                  .join("")}</select></div>`,
            )
            .join("") || "<p>这个范围内没有可导入的日程。</p>"
        }</div>${result.entries.length > 100 ? '<p class="dialog-description">预览前 100 段，其余按建议分类导入，之后可逐条修改。</p>' : ""}<div class="dialog-actions">${button("close", "取消", "x", "secondary-button")}<button class="primary-button" data-action="confirm-import" ${!result.entries.length ? "disabled" : ""}>${icon("check")}确认归档 ${result.entries.length} 段</button></div>`,
      );
    } catch (error) {
      $("#import-error").textContent =
        error instanceof Error
          ? error.message
          : "日历没有读取成功，请换一份 .ics 文件。";
    }
  });
}
function restoreDialog(repair = false) {
  if (demo) {
    toast("请先回到我的日历，再恢复真实备份。");
    return;
  }
  openDialog(
    `<h2>${repair ? "修复本机数据" : "带回之前的记录"}</h2><p class="dialog-description">${repair ? "请确认已经导出原始备份。选择有效的日迹备份，将替换无法读取的本机数据。" : "导入日迹导出的 JSON 备份，确认后合并；已有记录优先保留。"}</p><label class="file-drop">${icon("arrow-up-from-line")}<strong>选择备份文件</strong><span>.json · 最大 10 MB</span><input id="backup-file" type="file" accept=".json,application/json"></label><p id="restore-error" class="form-error" role="alert"></p>`,
  );
  $("#backup-file").addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("备份文件超过 10 MB。");
      const incoming = validateData(JSON.parse(await file.text())),
        next = repair ? incoming : mergeData(own, incoming);
      openDialog(
        `<h2>确认${repair ? "修复" : "合并"}记录</h2><p class="dialog-description">备份中有 ${incoming.entries.length} 段日常、${Object.keys(incoming.days).length} 天感受。${repair ? "当前无法读取的数据会被替换。" : "合并后共有 " + next.entries.length + " 段日常。"}</p><div class="dialog-actions">${button("close", "取消", "x", "secondary-button")}<button id="confirm-restore" class="primary-button">${icon("check")}确认${repair ? "修复" : "合并"}</button></div>`,
      );
      $("#confirm-restore").addEventListener("click", () => {
        try {
          saveData(next);
          own = next;
          storageError = undefined;
          closeDialog();
          render();
          toast("之前的记录，回来了。");
        } catch {
          toast("没有恢复成功，请检查存储空间。");
        }
      });
    } catch (error) {
      $("#restore-error").textContent =
        error instanceof Error ? error.message : "这份备份暂时无法读取。";
    }
  });
}
async function exportPicture(share: boolean) {
  try {
    const canvas = $<HTMLCanvasElement>("#share-canvas");
    const file = await canvasFile(
      canvas,
      `日迹-${options.period === "month" ? key(month).slice(0, 7) : selected}${demo ? "-示例" : ""}.png`,
    );
    if (share && navigator.canShare?.({ files: [file] }))
      await navigator.share({ files: [file], title: "生活的回响" });
    else {
      download(file, file.name);
      toast(
        share
          ? "图片已生成，可从保存的位置分享。"
          : "图片已生成，保存下来慢慢看。",
      );
    }
  } catch (error) {
    if ((error as Error).name !== "AbortError")
      toast("图片没有分享成功，请尝试保存图片。");
  }
}
document.addEventListener("click", (event) => {
  const target = (event.target as Element).closest<HTMLElement>("button");
  if (!target) return;
  if (target.dataset.view) {
    view = target.dataset.view as typeof view;
    render();
    window.scrollTo({ top: 0 });
    return;
  }
  if (target.dataset.day) {
    selected = target.dataset.day;
    const date = parseDay(selected);
    month = new Date(date.getFullYear(), date.getMonth(), 1);
    render();
    if (matchMedia("(max-width: 760px)").matches) {
      $(".day-panel").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    }
    return;
  }
  if (target.dataset.energy) {
    const energy = target.dataset.energy as Energy;
    updateDay({
      energy: data().days[selected]?.energy === energy ? undefined : energy,
    });
    return;
  }
  if (target.dataset.sleep) {
    const sleep = target.dataset.sleep as Day["sleep"];
    updateDay({
      sleep: data().days[selected]?.sleep === sleep ? undefined : sleep,
    });
    return;
  }
  if (target.dataset.meal) {
    const meals = data().days[selected]?.meals || [],
      m = target.dataset.meal;
    updateDay({
      meals: meals.includes(m) ? meals.filter((v) => v !== m) : [...meals, m],
    });
    return;
  }
  if (target.dataset.edit) {
    entryDialog(target.dataset.edit);
    return;
  }
  if (target.dataset.period) {
    options.period = target.dataset.period as ShareOptions["period"];
    render();
    return;
  }
  if (target.dataset.theme) {
    options.theme = target.dataset.theme as ShareOptions["theme"];
    render();
    return;
  }
  switch (target.dataset.action) {
    case "prev":
      setMonth(-1);
      break;
    case "next":
      setMonth(1);
      break;
    case "day-prev":
    case "day-next": {
      selected = key(
        shiftDay(
          parseDay(selected),
          target.dataset.action === "day-prev" ? -1 : 1,
        ),
      );
      const d = parseDay(selected);
      month = new Date(d.getFullYear(), d.getMonth(), 1);
      render();
      break;
    }
    case "today":
      today = new Date();
      selected = key(today);
      month = new Date(today.getFullYear(), today.getMonth(), 1);
      render();
      break;
    case "demo":
      demo = !demo;
      today = new Date();
      selected = key(today);
      month = new Date(today.getFullYear(), today.getMonth(), 1);
      render();
      break;
    case "add":
      entryDialog();
      break;
    case "close":
      closeDialog();
      break;
    case "coffee": {
      const coffees = data().days[selected]?.coffees || [];
      if (coffees.length >= 100) {
        toast("这一天的咖啡记录已经很多了。");
        break;
      }
      updateDay({
        coffees: [
          ...coffees,
          selected === key(today)
            ? timeLabel(new Date().toISOString())
            : "12:00",
        ],
      });
      toast(selected === key(today) ? "记下一杯咖啡。" : "已补记一杯咖啡。");
      break;
    }
    case "undo-coffee":
      updateDay({
        coffees: (data().days[selected]?.coffees || []).slice(0, -1),
      });
      break;
    case "import":
      importDialog();
      break;
    case "confirm-import": {
      if (!importResult) break;
      const incoming = importResult.entries,
        byId = new Map(own.entries.map((e) => [e.id, e]));
      incoming.forEach((e) => byId.set(e.id, e));
      if (commit({ ...own, entries: [...byId.values()] }, false)) {
        closeDialog();
        render();
        toast(`已归档 ${incoming.length} 段日常。`);
      }
      break;
    }
    case "delete": {
      const id = target.dataset.id;
      openDialog(
        `<h2>删除这一段日常？</h2><p class="dialog-description">只会移除日迹中的记录，不会修改原日历。</p><div class="dialog-actions">${button("close", "保留", "x", "secondary-button")}<button class="danger-button" id="confirm-delete">${icon("trash-2")}确认删除</button></div>`,
      );
      $("#confirm-delete").addEventListener("click", () => {
        if (
          commit(
            { ...data(), entries: data().entries.filter((e) => e.id !== id) },
            false,
          )
        ) {
          closeDialog();
          render();
          toast("已移除这一段。");
        }
      });
      break;
    }
    case "backup":
      download(
        new Blob([rawBackup()], { type: "application/json" }),
        `日迹备份-${key(new Date())}.json`,
      );
      toast("本机记录已导出。");
      break;
    case "restore":
      restoreDialog();
      break;
    case "repair":
      restoreDialog(true);
      break;
    case "download":
      void exportPicture(false);
      break;
    case "share":
      void exportPicture(true);
      break;
  }
});
document.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement;
  if (target.dataset.option) {
    options = { ...options, [target.dataset.option]: target.checked };
    render();
  }
  if (target.dataset.importCategory && importResult)
    importResult.entries[Number(target.dataset.importCategory)].category =
      target.value as Category;
});
window.addEventListener("storage", (event) => {
  if (event.key === "daytrace.data.v1") {
    const next = loadData();
    own = next.data;
    storageError = next.error;
    render();
    toast("已载入另一个窗口的记录。");
  }
});
document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    key(today) !== key(new Date())
  ) {
    const wasToday = selected === key(today);
    today = new Date();
    if (wasToday) {
      selected = key(today);
      month = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    render();
  }
});
registerSW({
  onOfflineReady() {
    toast("这一页已可以离线打开。");
  },
  onNeedRefresh() {
    toast("新版本已准备好，关闭所有日迹窗口后再打开即可更新。");
  },
});
render();
