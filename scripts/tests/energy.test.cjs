const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../../miniprogram/lib/energy.js");
// Preserve the old model as a regression suite for pre-upgrade histories.
const e = { ...model, empty: () => { const {modelStart, ...s} = model.empty(); return {...s,version:2}; } };
const t = new Date("2026-09-15T08:00:00").getTime();

test("首次没有假定电量，以第一次感受为起点；零分母为空", () => {
  let s = e.empty();
  assert.equal(e.battery(s, t).value, null);
  assert.equal(e.battery(s, t).anchor, null);
  assert.equal(e.battery(s, t).initial, true);
  assert.equal(e.daily(s, e.dayKey(t)).ratio, null);
  s = e.addEvent(s, { preset: "meal" }, t);
  assert.equal(e.battery(s, t).value, null);
  s = e.calibrate(s, 60, t);
  s = e.addEvent(s, { preset: "work" }, t);
  assert.equal(e.battery(s, t).value, 50);
  s = e.removeEvent(s, s.events.at(-1).id);
  assert.equal(e.daily(s, e.dayKey(t)).ratio, null);
  assert.equal(e.battery(s, t).value, 60);
});
test("睡眠不重复加分，当前余量和日补回比各自正确", () => {
  let s = e.addEvent(
    e.empty(),
    { preset: "sleep", points: 20, minutes: 420 },
    t,
  );
  s = e.calibrate(s, 45, t + 1);
  for (const [i, preset] of [
    "work",
    "meal",
    "social",
    "cat",
    "unexpected",
  ].entries())
    s = e.addEvent(
      s,
      { preset, points: preset === "work" ? 20 : 10 },
      t + 2 + i,
    );
  assert.equal(e.battery(s, t + 100).value, 25);
  const d = e.daily(s, e.dayKey(t));
  assert.deepEqual([d.charge, d.discharge, d.ratio], [40, 40, 100]);
});
test("逐事件截断，不把满电溢出存成未来电量", () => {
  let s = e.calibrate(e.empty(), 90, t);
  s = e.addEvent(s, { preset: "cat", points: 20 }, t + 1);
  s = e.addEvent(s, { preset: "work", points: 20 }, t + 2);
  assert.equal(e.battery(s, t + 3).value, 80);
  s = e.calibrate(s, 5, t + 4);
  s = e.addEvent(s, { preset: "work" }, t + 5);
  assert.equal(e.battery(s, t + 6).value, -5);
});

test("透支继续累计，恢复和撤销都有实际反馈，校准可重新起步", () => {
  let s = e.calibrate(e.empty(), 100, t - 1);
  for (let i = 0; i < 16; i++)
    s = e.addEvent(s, { preset: "work", points: 20 }, t + i);
  assert.equal(e.battery(s, t + 20).value, -220);
  s = e.addEvent(s, { preset: "cat" }, t + 21);
  assert.equal(e.battery(s, t + 22).value, -210);
  s = e.removeEvent(s, s.events.at(-1).id);
  assert.equal(e.battery(s, t + 23).value, -220);
  s = e.editEvent(s, s.events[0].id, { points: 10 }, t + 24);
  assert.equal(e.battery(s, t + 25).value, -210);
  assert.equal(
    e.battery(e.validate(JSON.parse(JSON.stringify(s)), t + 26), t + 26).value,
    -210,
  );
  s = e.calibrate(s, 40, t + 27);
  assert.equal(e.battery(s, t + 28).value, 40);
  assert.equal(e.daily(s, e.dayKey(t)).discharge, 310);
});
test("同毫秒先后顺序、补记、编辑与删除后重算", () => {
  let s = e.addEvent(e.empty(), { preset: "sleep" }, t);
  s = e.calibrate(s, 50, t);
  s = e.addEvent(s, { preset: "cat" }, t);
  assert.equal(e.battery(s, t).value, 60);
  const added = s.events.at(-1).id;
  s = e.editEvent(s, added, { points: 20 }, t);
  assert.equal(e.battery(s, t).value, 70);
  s = e.addEvent(s, { preset: "work", at: t - 60000 }, t);
  assert.equal(e.battery(s, t).value, 70);
  s = e.removeEvent(s, added);
  assert.equal(e.battery(s, t).value, 50);
});
test("跨日不自动满电；超过一天提示过期", () => {
  const s = e.calibrate(e.empty(), 25, t);
  assert.equal(e.battery(s, t + 86400001).value, 25);
  assert.equal(e.battery(s, t + 86400001).stale, true);
});
test("睡眠按结束日期记账，过去与未来不会混淆", () => {
  let s = e.addEvent(e.empty(), { preset: "sleep", minutes: 450 }, t);
  assert.equal(e.daily(s, e.dayKey(t)).charge, 20);
  assert.equal(e.daily(s, e.dayKey(t - 86400000)).charge, 0);
  assert.throws(() => e.addEvent(s, { preset: "cat", at: t + 1 }, t));
});
test("计时持久化，仅确认后记分，同一来源去重", () => {
  let s = e.startTimer(e.empty(), t);
  const timerId = s.timer.id;
  s = e.validate(JSON.parse(JSON.stringify(s)), t + 60000);
  assert.equal(s.events.length, 0);
  s = e.finishTimer(s, { preset: "work" }, t + 1800000);
  assert.equal(s.timer, null);
  assert.equal(s.events[0].minutes, 30);
  const same = e.addEvent(
    s,
    { preset: "work", sourceId: timerId },
    t + 1800001,
  );
  assert.equal(same.events.length, 1);
  s = e.startTimer(s, t + 2000000);
  s = e.finishTimer(s, null, t + 3000000);
  assert.equal(s.events.length, 1);
});
test("坏备份不会通过，合法记录可往返", () => {
  let s = e.calibrate(e.empty(), 50, t);
  s = e.addEvent(s, { preset: "cat" }, t + 1);
  assert.deepEqual(e.validate(JSON.parse(JSON.stringify(s)), t + 2), s);
  assert.throws(() =>
    e.validate({ ...s, events: [...s.events, ...s.events] }, t + 2),
  );
  assert.throws(() =>
    e.validate({ ...s, events: [{ ...s.events[0], points: Infinity }] }, t + 2),
  );
  assert.throws(() => e.validate({ ...s, seq: 0 }, t + 2));
});
test("保存失败不会报成功；损坏记录保持原样", () => {
  let raw = { broken: true };
  global.wx = {
    getStorageSync: () => raw,
    setStorageSync: () => {
      throw new Error("full");
    },
  };
  const store = require("../../miniprogram/lib/storage.js");
  assert.ok(store.read().error);
  assert.throws(() => store.save(e.empty()));
  assert.equal(store.raw(), JSON.stringify(raw));
  raw = undefined;
  assert.equal(store.read().error, null);
  assert.throws(() => store.save(e.empty()), /full/);
  delete global.wx;
});
