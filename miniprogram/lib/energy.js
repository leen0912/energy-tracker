const LEVELS = [5, 10, 20];
const INITIAL_ENERGY = null;
const FEELINGS = [
  { id: "exhausted", label: "很累", value: 20 },
  { id: "tired", label: "有点累", value: 40 },
  { id: "okay", label: "还可以", value: 60 },
  { id: "bright", label: "有精神", value: 80 },
];
const PRESETS = [
  { id: "cat", label: "弟弟靠过来了", short: "弟弟靠过来", direction: 1, icon: "cat" },
  { id: "meal", label: "吃上饭了", short: "吃上饭了", direction: 1, icon: "utensils" },
  { id: "sleep", label: "眯了一会儿", short: "眯了一会儿", direction: 1, icon: "moon" },
  { id: "home", label: "终于到家", short: "终于到家", direction: 1, icon: "house" },
  { id: "rest", label: "歇了一会儿", short: "歇了一会儿", direction: 1, icon: "leaf" },
  { id: "commute", label: "通勤挤累了", short: "通勤挤累了", direction: -1, icon: "train" },
  { id: "work", label: "一段工作", short: "一段工作", direction: -1, icon: "briefcase" },
  { id: "social", label: "人际支出", short: "人际支出", direction: -1, icon: "users" },
  { id: "unexpected", label: "莫名其妙掉电", short: "莫名其妙掉电", direction: -1, icon: "cloud" },
  { id: "sun", label: "晒得一身汗", short: "晒得一身汗", direction: -1, icon: "sun" },
  { id: "rain", label: "淋雨湿了鞋", short: "淋雨湿了鞋", direction: -1, icon: "rain" },
  { id: "coffee", label: "喝了杯咖啡", short: "咖啡", direction: 0, icon: "coffee" },
  { id: "tea", label: "喝了杯奶茶", short: "奶茶", direction: 0, icon: "cup" },
  { id: "supplement", label: "吃了补剂", short: "补剂", direction: 0, icon: "pill" },
];
const empty = () => ({ version: 2, originValue: null, originAt: null, events: [], calibrations: [], timer: null, seq: 0, settings: { reducedMotion: false } });
const dayKey = (t) => {
  const d = new Date(t);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const timeText = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const id = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const ordered = (a, b) => a.at - b.at || a.seq - b.seq;
const validTime = (t, now) => Number.isFinite(t) && Number.isFinite(new Date(t).getTime()) && t <= now;
function metadata(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("记录详情不正确");
  const clean = {};
  const choices = { mealStatus: ["eaten", "pending", "skipped"], fullness: ["hungry", "enough", "full"], satisfaction: ["ordinary", "happy"] };
  for (const [key, values] of Object.entries(choices)) {
    if (raw[key] !== undefined && raw[key] !== "") {
      if (!values.includes(raw[key])) throw new Error("记录详情不正确");
      clean[key] = raw[key];
    }
  }
  if (raw.amount !== undefined) {
    if (typeof raw.amount !== "string" || raw.amount.length > 40) throw new Error("用量描述请控制在 40 字内");
    if (raw.amount.trim()) clean.amount = raw.amount.trim();
  }
  return clean;
}
function pointsFor(input) {
  if (input.direction === 0) return 0;
  if (input.impact) return { light: 5, normal: 10, heavy: 20 }[input.impact];
  if (input.points !== undefined) return input.points;
  if (input.minutes !== undefined) return input.minutes <= 15 ? 5 : input.minutes <= 120 ? 10 : 20;
  if (input.preset === "meal") {
    if (input.meta && input.meta.fullness === "hungry") return 5;
    if (input.meta && input.meta.satisfaction === "happy") return 20;
  }
  return 10;
}
function addEvent(state, input, now = Date.now()) {
  if (input.sourceId && state.events.some((e) => e.sourceId === input.sourceId)) return state;
  if (state.events.length >= 10000) throw new Error("记录空间已满，请先导出备份");
  const preset = PRESETS.find((p) => p.id === input.preset);
  if (!preset) throw new Error("记录类型不正确");
  const at = input.at === undefined ? now : input.at;
  const meta = metadata(input.meta);
  const direction = preset.id === "meal" && ["pending", "skipped"].includes(meta.mealStatus) ? 0 : input.direction === undefined ? preset.direction : input.direction;
  const points = pointsFor({ ...input, direction, meta });
  const label = String(input.label === undefined ? preset.label : input.label).trim();
  if (!label || label.length > 80 || !validTime(at, now) || ![-1, 0, 1].includes(direction) || (direction === 0 ? points !== 0 : !LEVELS.includes(points))) throw new Error("记录的名称、时间或影响程度不正确");
  if (input.minutes !== undefined && (!Number.isFinite(input.minutes) || input.minutes < 0 || input.minutes > 10080)) throw new Error("时长请填 0 到 10080 分钟");
  if (input.impact && !["light", "normal", "heavy"].includes(input.impact)) throw new Error("影响程度不正确");
  const event = { id: id(), seq: state.seq + 1, at, preset: preset.id, label, direction, points, note: String(input.note || "").slice(0, 500), ruleVersion: 2, meta };
  if (input.minutes !== undefined) event.minutes = input.minutes;
  if (input.impact) event.impact = input.impact;
  if (input.sourceId) event.sourceId = String(input.sourceId);
  return { ...state, seq: event.seq, events: state.events.concat(event) };
}
function calibrate(state, value, now = Date.now()) {
  if (!Number.isInteger(value) || value < 0 || value > 100 || !validTime(now, Date.now())) throw new Error("感受起点不正确");
  if (state.calibrations.length >= 10000) throw new Error("记录空间已满，请先导出备份");
  const observation = { id: id(), seq: state.seq + 1, at: now, value };
  return { ...state, seq: observation.seq, calibrations: state.calibrations.concat(observation) };
}
function battery(state, now = Date.now()) {
  const anchor = state.calibrations.filter((c) => c.at <= now).sort(ordered).pop();
  let value = anchor ? anchor.value : state.originValue === 100 ? 100 : null;
  const changes = [];
  state.events.filter((e) => e.at <= now && (!anchor || ordered(e, anchor) > 0)).sort(ordered).forEach((e) => {
    let applied = e.points;
    // A later feeling already covers the earlier part of an overlapping interval.
    if (e.ruleVersion === 2 && anchor && e.minutes > 0 && e.at - e.minutes * 60000 < anchor.at) {
      applied = Math.round(e.points * Math.max(0, e.at - anchor.at) / (e.minutes * 60000));
    }
    if (value !== null) value = Math.min(100, value + e.direction * applied);
    changes.push({ id: e.id, value, applied });
  });
  const referenceAt = anchor ? anchor.at : state.originAt;
  const lastAt = Math.max(referenceAt || 0, ...state.events.filter((e) => e.at <= now).map((e) => e.at));
  return { value, anchor: anchor || null, initial: value === null, stale: value !== null && (!referenceAt || now - referenceAt > 86400000), lastAt: lastAt || null, changes };
}
function daily(state, date = dayKey(Date.now())) {
  const events = state.events.filter((e) => dayKey(e.at) === date).sort(ordered);
  const charge = events.filter((e) => e.direction > 0).reduce((n, e) => n + e.points, 0);
  const discharge = events.filter((e) => e.direction < 0).reduce((n, e) => n + e.points, 0);
  const ratio = discharge ? Math.round(charge / discharge * 100) : null;
  return { events, charge, discharge, ratio, net: charge - discharge, ratioText: ratio === null ? "—" : `${ratio}%` };
}
function removeEvent(state, eventId) { return { ...state, events: state.events.filter((e) => e.id !== eventId) }; }
function editEvent(state, eventId, patch, now = Date.now()) {
  const old = state.events.find((e) => e.id === eventId);
  if (!old) throw new Error("记录已不存在");
  const clean = addEvent({ ...empty(), seq: old.seq - 1 }, { ...old, ...patch, sourceId: undefined }, now).events[0];
  return { ...state, events: state.events.map((e) => e.id === eventId ? { ...clean, id: old.id, seq: old.seq, ...(old.sourceId ? { sourceId: old.sourceId } : {}) } : e) };
}
function startTimer(state, now = Date.now()) { return state.timer ? state : { ...state, timer: { id: id(), start: now } }; }
function finishTimer(state, input, now = Date.now()) {
  if (!state.timer) return state;
  const next = input ? addEvent(state, { ...input, minutes: Math.min(10080, Math.max(0, Math.round((now - state.timer.start) / 60000))), sourceId: state.timer.id }, now) : state;
  return { ...next, timer: null };
}
function validate(value, now = Date.now()) {
  if (!value || ![1, 2].includes(value.version) || !Array.isArray(value.events) || !Array.isArray(value.calibrations) || value.events.length > 10000 || value.calibrations.length > 10000 || !Number.isSafeInteger(value.seq) || value.seq < 0) throw new Error("不是有效的电量备份");
  const ids = new Set(), sequences = new Set(), sources = new Set();
  for (const item of value.events.concat(value.calibrations)) {
    if (!item || typeof item.id !== "string" || !item.id || item.id.length > 200 || ids.has(item.id) || !Number.isSafeInteger(item.seq) || item.seq < 1 || item.seq > value.seq || sequences.has(item.seq) || !validTime(item.at, now)) throw new Error("备份中的记录格式不正确");
    ids.add(item.id); sequences.add(item.seq);
  }
  const events = value.events.map((e) => {
    if (typeof e.label !== "string" || typeof e.note !== "string" || e.note.length > 500 || ![1, 2].includes(e.ruleVersion) || (e.direction === 0 ? e.points !== 0 : !LEVELS.includes(e.points)) || (value.version === 1 && ![-1, 1].includes(e.direction))) throw new Error("备份中的能量事件不正确");
    if (e.sourceId !== undefined && (typeof e.sourceId !== "string" || !e.sourceId || e.sourceId.length > 200 || sources.has(e.sourceId))) throw new Error("备份中的计时记录重复或不正确");
    if (e.sourceId) sources.add(e.sourceId);
    const clean = addEvent({ ...empty(), seq: e.seq - 1 }, e, now).events[0];
    if (clean.direction !== e.direction || clean.points !== e.points) throw new Error("备份中的影响程度与详情不一致");
    return { ...clean, id: e.id, ruleVersion: e.ruleVersion };
  });
  const calibrations = value.calibrations.map((c) => {
    if (!Number.isInteger(c.value) || c.value < 0 || c.value > 100) throw new Error("备份中的电量不正确");
    return { id: c.id, seq: c.seq, at: c.at, value: c.value };
  });
  let timer = null;
  if (value.timer !== null && value.timer !== undefined) {
    if (typeof value.timer.id !== "string" || !value.timer.id || !validTime(value.timer.start, now)) throw new Error("计时记录不正确");
    timer = { id: value.timer.id, start: value.timer.start };
  }
  // Legacy events retain their original 100-point basis; an empty install does not.
  const legacy = value.version === 1 && events.length > 0;
  const originValue = value.version === 1 ? legacy ? 100 : null : value.originValue;
  const originAt = value.version === 1 ? legacy ? Math.min(...events.map((e) => e.at)) : null : value.originAt;
  if (![null, 100].includes(originValue) || (originValue === 100 ? !validTime(originAt, now) : originAt !== null)) throw new Error("备份中的初始状态不正确");
  if (value.settings && typeof value.settings.reducedMotion !== "boolean") throw new Error("动效设置不正确");
  return { version: 2, originValue, originAt, seq: value.seq, events, calibrations, timer, settings: { reducedMotion: !!(value.settings && value.settings.reducedMotion) } };
}
module.exports = { INITIAL_ENERGY, LEVELS, FEELINGS, PRESETS, empty, dayKey, timeText, addEvent, calibrate, battery, daily, removeEvent, editEvent, startTimer, finishTimer, validate, pointsFor };
