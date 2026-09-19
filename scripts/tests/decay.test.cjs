const test = require('node:test');
const assert = require('node:assert/strict');
const e = require('../../miniprogram/lib/energy');
const t = new Date('2026-09-15T08:00:00').getTime(), hour = 3600000;
const start = (value=60,at=t) => e.calibrate(e.empty(),value,at);

test('new model declines with elapsed time without writing events or needing background execution', () => {
  const s = start();
  assert.equal(e.battery(s,t).value,60);
  assert.equal(e.battery(s,t+2*hour).value,54);
  assert.equal(e.battery(s,t+8*hour).value,36);
  assert.equal(e.battery(s,t+12*hour).value,24);
  assert.equal(e.battery(s,t+9*24*hour).value,24);
  assert.equal(e.battery(s,t+12*hour).stale,true);
  assert.equal(s.events.length,0);
  assert.equal(e.battery(e.empty(),t+hour).value,null);
});
test('midnight pauses estimation, no overnight debt or automatic morning recharge', () => {
  const at = new Date('2026-09-15T23:00:00').getTime(), s = start(60,at);
  assert.equal(e.battery(s,at+hour).value,57);
  assert.equal(e.battery(s,at+9*hour).value,57);
  assert.equal(e.battery(s,at+9*hour).stale,true);
  assert.equal(e.battery(e.calibrate(s,40,at+9*hour),at+10*hour).value,37);
});
test('passive depletion stops at zero, explicit fatigue can still create debt', () => {
  let s = start(5);
  assert.equal(e.battery(s,t+4*hour).value,0);
  s = e.addEvent(s,{preset:'work'},t+4*hour);
  assert.equal(e.battery(s,t+5*hour).value,-10);
  s = e.addEvent(s,{preset:'cat'},t+5*hour);
  assert.equal(e.battery(s,t+5*hour).value,0);
});
test('recovery tapers near full, repeated records cannot manufacture 100', () => {
  let low = start(60), high = start(90);
  for (let i=0;i<4;i++) {
    low = e.addEvent(low,{preset:'cat'},t);
    high = e.addEvent(high,{preset:'cat'},t);
  }
  assert.equal(e.battery(low,t).value,74);
  assert.equal(e.battery(high,t).value,93);
  for (let i=0;i<100;i++) high = e.addEvent(high,{preset:'meal'},t);
  assert.equal(e.battery(high,t).value,99);
  const full = e.addEvent(start(100),{preset:'cat'},t);
  assert.equal(e.battery(full,t).value,100);
  assert.equal(e.battery(full,t+hour).value,97);
  const nearFull = e.addEvent(start(100),{preset:'cat'},t+60000);
  assert.equal(e.battery(nearFull,t+60000).value,100);
  assert.equal(e.battery(nearFull,t+60000).changes[0].applied,0);
});
test('recorded sleep intervals are merged, clipped and excluded from passive drain', () => {
  let s = start();
  s = e.addEvent(s,{preset:'sleep',direction:0,minutes:120},t+2*hour);
  s = e.addEvent(s,{preset:'sleep',direction:0,minutes:120},t+3*hour);
  const result = e.battery(s,t+4*hour);
  assert.equal(result.value,57);
  assert.equal(result.sleepMinutes,180);
  assert.equal(result.naturalDrain,3);
  s = e.removeEvent(s,s.events[1].id);
  assert.equal(e.battery(s,t+4*hour).value,54);
});
test('sleep backfill spanning a feeling only excludes time after that feeling', () => {
  let s = start();
  s = e.addEvent(s,{preset:'sleep',direction:0,minutes:480},t+hour);
  assert.equal(e.battery(s,t+2*hour).value,57);
  assert.equal(e.battery(s,t+2*hour).sleepMinutes,60);
});
test('timed default strain credits baseline time; explicit impact means extra strain', () => {
  const timed = e.addEvent(start(),{preset:'work',minutes:120},t+2*hour);
  const extra = e.addEvent(start(),{preset:'work',minutes:120,impact:'heavy'},t+2*hour);
  assert.equal(e.battery(timed,t+2*hour).value,50);
  assert.equal(e.battery(timed,t+2*hour).naturalDrain,6);
  assert.equal(e.battery(timed,t+2*hour).changes[0].applied,4);
  assert.equal(e.battery(extra,t+2*hour).value,34);
  const crossAnchor = e.addEvent(start(),{preset:'work',minutes:120},t+hour);
  assert.equal(e.battery(crossAnchor,t+hour).value,55);
});
test('timed strain only credits actual passive deductions, so zero does not hide exhaustion', () => {
  const zero = e.addEvent(start(0),{preset:'work',minutes:480},t+8*hour);
  const low = e.addEvent(start(5),{preset:'work',minutes:480},t+8*hour);
  assert.equal(e.battery(zero,t+8*hour).value,-20);
  assert.equal(e.battery(low,t+8*hour).value,-15);
  // All five baseline points were spent before this one-hour event started.
  const late = e.addEvent(start(5),{preset:'work',minutes:60},t+8*hour);
  assert.equal(e.battery(late,t+8*hour).value,-10);
});
test('meal and neutral records cannot suppress clock drain', () => {
  let s = start();
  for (const preset of ['coffee','tea','supplement']) s = e.addEvent(s,{preset},t+hour);
  s = e.addEvent(s,{preset:'meal',meta:{mealStatus:'pending'}},t+hour);
  assert.equal(e.battery(s,t+2*hour).value,54);
});
test('upgrade preserves current legacy value, starts decay now, and is idempotent', () => {
  const {modelStart,...base} = e.empty();
  let old = e.calibrate({...base,version:2},60,t);
  old = e.addEvent(old,{preset:'work'},t+1);
  const next = e.upgrade(e.validate(old,t+24*hour),t+24*hour);
  assert.equal(e.battery(next,t+24*hour).value,50);
  assert.equal(e.battery(next,t+25*hour).value,47);
  assert.deepEqual(next.events,old.events);
  assert.equal(e.upgrade(next,t+25*hour),next);
  assert.deepEqual(e.validate(JSON.parse(JSON.stringify(next)),t+25*hour),next);
  assert.equal(e.battery(e.calibrate(next,80,t+25*hour),t+25*hour).value,80);
});
test('new model backup roundtrip preserves decay; malformed anchors are rejected', () => {
  let s = e.addEvent(start(),{preset:'cat'},t+hour);
  const restored = e.validate(JSON.parse(JSON.stringify(s)),t+2*hour);
  assert.equal(e.battery(restored,t+2*hour).value,e.battery(s,t+2*hour).value);
  for (const modelStart of [undefined,{at:t+10*hour,seq:0,value:60},{at:t,seq:999,value:60},{at:t,seq:0,value:101}]) {
    assert.throws(() => e.validate({...s,modelStart},t+2*hour));
  }
});
test('storage migration backs up once and failed migration leaves old data intact', () => {
  const key = 'daytrace.energy.wx.v1';
  const {modelStart,...base} = e.empty();
  const old = e.calibrate({...base,version:2},60,t);
  const memory = new Map([[key,old]]), writes = [];
  global.wx = {getStorageSync:k=>memory.get(k),setStorageSync:(k,v)=>{writes.push(k);memory.set(k,v);}};
  const store = require('../../miniprogram/lib/storage');
  assert.equal(store.read().state.version,3);
  assert.deepEqual(memory.get(key+'.before-energy-v3'),old);
  const firstAnchor = memory.get(key).modelStart;
  store.read(); assert.deepEqual(memory.get(key).modelStart,firstAnchor);
  assert.equal(writes.length,2);
  memory.set(key,old);
  global.wx.setStorageSync = () => {throw new Error('full');};
  assert.ok(store.read().error);
  assert.deepEqual(memory.get(key),old);
  delete global.wx;
});
