const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../../miniprogram/lib/energy');
const e = { ...model, empty: () => { const {modelStart, ...s} = model.empty(); return {...s,version:2}; } };
const garden = require('../../miniprogram/lib/garden');
const t = Date.now() - 1000000;
test('旧版本保留100基准、分数与顺序，空安装不保留默认100', () => {
  const original = e.addEvent(e.empty(), { preset: 'work', points: 20 }, t);
  const old = { version: 1, seq: original.seq, events: original.events.map((event) => ({ ...event, ruleVersion: 1 })), calibrations: [], timer: null };
  const migrated = e.validate(old);
  assert.equal(e.battery(migrated).value, 80);
  assert.equal(e.battery(migrated, t + 8 * 86400000).stale, true);
  assert.deepEqual(e.validate(migrated), migrated);
  assert.equal(e.battery(e.validate({ ...old, events: [], seq: 0 })).value, null);
});
test('三种饮品补剂默认中性，不伪造精力，但都长进花园', () => {
  let state = e.calibrate(e.empty(), 40, t);
  for (const preset of ['coffee', 'tea', 'supplement']) state = e.addEvent(state, { preset, meta: { amount: '半杯' } }, t + 1);
  assert.equal(e.battery(state).value, 40);
  assert.equal(garden.forDay(state, e.dayKey(t)).count, 3);
  assert.equal(garden.forDay(state, e.dayKey(t)).cat, false);
  assert.deepEqual(e.validate(state), state);
  state = e.addEvent(state, { preset: 'coffee', direction: -1, impact: 'light' }, t + 2);
  assert.equal(e.battery(state).value, 35);
});
test('时长与可选影响分别区分短通勤和一整天，不显示分数选择', () => {
  const short = e.addEvent(e.empty(), { preset: 'commute', minutes: 10 }, t).events[0];
  const long = e.addEvent(e.empty(), { preset: 'work', minutes: 480 }, t).events[0];
  const explicit = e.addEvent(e.empty(), { preset: 'work', minutes: 480, impact: 'light' }, t).events[0];
  assert.deepEqual([short.points, long.points, explicit.points], [5, 20, 5]);
});
test('未吃不扣分；吃饭的时间、饱足与满足可以分别保存', () => {
  let s = e.calibrate(e.empty(), 40, t);
  s = e.addEvent(s, { preset: 'meal', meta: { mealStatus: 'pending' } }, t + 1);
  assert.equal(e.battery(s).value, 40);
  s = e.editEvent(s, s.events[0].id, { at: t + 2, direction: 1, points: undefined, meta: { mealStatus: 'eaten', fullness: 'enough', satisfaction: 'happy' } });
  assert.equal(s.events.length, 1);
  assert.equal(e.battery(s).value, 60);
  assert.deepEqual(e.validate(s), s);
  assert.throws(() => e.addEvent(s, { preset: 'meal', meta: { fullness: 'wrong' } }));
});
test('补记醒来时间早于感受起点，电量不重复加，但花园保留', () => {
  let s = e.calibrate(e.empty(), 60, t);
  s = e.addEvent(s, { preset: 'sleep', at: t - 60000, minutes: 420 }, t + 2);
  assert.equal(e.battery(s).value, 60);
  assert.equal(garden.forDay(s, e.dayKey(t)).count, 1);
});
test('删除、编辑和大量中性/消耗记录生成确定的场景，不叠加花束', () => {
  let s = e.empty();
  for (let i = 0; i < 80; i++) s = e.addEvent(s, { preset: 'work' }, t + i);
  assert.equal(garden.forDay(s, e.dayKey(t)).stage, 3);
  assert.equal(garden.forDay(s, e.dayKey(t)).asset, 'window-3.jpg');
  s = e.addEvent(s, { preset: 'cat' }, t + 100);
  assert.equal(garden.forDay(s, e.dayKey(t)).cat, true);
  s = e.removeEvent(s, s.events.at(-1).id);
  assert.equal(garden.forDay(s, e.dayKey(t)).cat, false);
});
test('非法时间、方向、数值、详情和超限记录拒绝写入', () => {
  for (const input of [{ at: 1e20 }, { direction: 4 }, { direction: 0, points: 10, meta: null }, { minutes: -1 }, { impact: 'wrong' }, { label: 'x'.repeat(81) }, { meta: { amount: 'a'.repeat(41) } }]) {
    assert.throws(() => e.addEvent(e.empty(), { preset: 'cat', ...input }));
  }
  assert.throws(() => e.addEvent({ ...e.empty(), events: Array(10000).fill({}) }, { preset: 'cat' }));
});
test('中性计时结束去重；设置和历史感受可备份往返', () => {
  let s = e.calibrate(e.empty(), 20, t);
  s = e.startTimer(s, t + 1);
  s = e.finishTimer(s, { preset: 'work', direction: 0 }, t + 61000);
  assert.equal(s.events[0].points, 0);
  assert.equal(e.battery(s).value, 20);
  assert.equal(e.finishTimer(s, { preset: 'work' }).events.length, 1);
  s.settings.reducedMotion = true;
  assert.deepEqual(e.validate(s), s);
});
test('跨过感受起点的长经历只归属起点以后的比例，旧规则不被重写', () => {
  let s = e.calibrate(e.empty(), 60, t - 15 * 60000);
  s = e.addEvent(s, { preset: 'work', minutes: 60, impact: 'heavy' }, t);
  assert.equal(e.battery(s).value, 55);
  assert.equal(s.events[0].points, 20);
  s.events[0].ruleVersion = 1;
  assert.equal(e.battery(s).value, 40);
});
