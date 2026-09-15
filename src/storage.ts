import {
  CATEGORIES,
  emptyData,
  type Data,
  type Day,
  type Entry,
} from "./model";
const STORE = "daytrace.data.v1";
const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function validateData(value: unknown): Data {
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !Array.isArray(value.entries) ||
    !isObject(value.days) ||
    value.entries.length > 30000
  )
    throw new Error("这份文件不是有效的日迹备份。");
  const ids = new Set<string>();
  for (const e of value.entries) {
    if (
      !isObject(e) ||
      typeof e.id !== "string" ||
      !e.id ||
      ids.has(e.id) ||
      typeof e.title !== "string" ||
      e.title.length > 200 ||
      typeof e.category !== "string" ||
      !Object.hasOwn(CATEGORIES, e.category) ||
      typeof e.start !== "string" ||
      typeof e.end !== "string" ||
      !Number.isFinite(Date.parse(e.start)) ||
      !Number.isFinite(Date.parse(e.end)) ||
      Date.parse(e.end) <= Date.parse(e.start) ||
      !["manual", "calendar"].includes(String(e.source)) ||
      (e.allDay !== undefined && typeof e.allDay !== "boolean")
    )
      throw new Error("备份中的日程格式有误，原有记录未被修改。");
    ids.add(e.id);
  }
  const days: Record<string, Day> = {};
  for (const [date, d] of Object.entries(value.days)) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) ||
      new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date ||
      !isObject(d) ||
      (d.note !== undefined &&
        (typeof d.note !== "string" || d.note.length > 1000)) ||
      (d.energy !== undefined &&
        !["low", "mid", "high"].includes(String(d.energy))) ||
      (d.sleep !== undefined &&
        !["less", "okay", "enough"].includes(String(d.sleep)))
    )
      throw new Error("备份中的感受记录格式有误。");
    if (
      d.meals !== undefined &&
      (!Array.isArray(d.meals) ||
        !d.meals.every((m) => ["早餐", "午餐", "晚餐"].includes(m)))
    )
      throw new Error("饮食记录格式有误。");
    if (
      d.coffees !== undefined &&
      (!Array.isArray(d.coffees) ||
        d.coffees.length > 100 ||
        !d.coffees.every(
          (c) => typeof c === "string" && /^\d{2}:\d{2}$/.test(c),
        ))
    )
      throw new Error("咖啡记录格式有误。");
    days[date] = {
      note: d.note as string | undefined,
      energy: d.energy as Day["energy"],
      sleep: d.sleep as Day["sleep"],
      meals: d.meals as string[] | undefined,
      coffees: d.coffees as string[] | undefined,
    };
  }
  return {
    version: 1,
    entries: (value.entries as Entry[]).map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      start: e.start,
      end: e.end,
      source: e.source,
      allDay: e.allDay,
    })),
    days,
  };
}
export function loadData(): { data: Data; error?: string } {
  try {
    const raw = localStorage.getItem(STORE);
    return { data: raw ? validateData(JSON.parse(raw)) : emptyData() };
  } catch {
    return {
      data: emptyData(),
      error:
        "本机记录暂时无法读取。请先导出原始备份，再尝试恢复；本次不会覆盖旧记录。",
    };
  }
}
export function saveData(data: Data) {
  localStorage.setItem(STORE, JSON.stringify(data));
}
export function rawBackup() {
  return localStorage.getItem(STORE) || JSON.stringify(emptyData());
}
export function mergeData(current: Data, incoming: Data): Data {
  const ids = new Map(current.entries.map((e) => [e.id, e]));
  for (const entry of incoming.entries)
    if (!ids.has(entry.id)) ids.set(entry.id, entry);
  return {
    version: 1,
    entries: [...ids.values()],
    days: { ...incoming.days, ...current.days },
  };
}
