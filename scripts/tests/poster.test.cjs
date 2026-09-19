const test = require('node:test');
const assert = require('node:assert/strict');
const energy = require('../../miniprogram/lib/energy');
const poster = require('../../miniprogram/lib/poster');
const garden = require('../../miniprogram/lib/garden');

test('every template uses the same dated scene in portrait and square exports', () => {
  const images = [];
  global.wx = { createCanvasContext: () => ({ setFontSize() {}, setFillStyle() {}, fillRect() {}, fillText() {}, drawImage: (src) => images.push(src), draw: (_, done) => done() }), canvasToTempFilePath: (o) => o.success({tempFilePath:'poster.png'}) };
  try {
    for (const date of ['2026-09-19','2026-09-20','2026-09-21','2026-09-22']) {
      const state = energy.empty(), at = new Date(`${date}T12:00:00`).getTime();
      state.events = [0,1,2,3].map((i) => ({id:`event-${i}`,seq:i,at,preset:i ? 'work' : 'cat',label:'测试记录',direction:0,points:0}));
      for (const format of ['portrait','square']) {
        poster.draw({},state,date,true,(err) => assert.ifError(err),0,format);
        assert.equal(images.at(-1),`/assets/${garden.templateForDate(date)}-3-didi.jpg`);
      }
    }
  } finally { delete global.wx; }
});
test('长记录逐字保留、横竖分别分页、隐私开关不泄露名称和备注', () => {
  let state = energy.empty(); const date = energy.dayKey(Date.now());
  for (let i = 0; i < 18; i++) state = energy.addEvent(state, { preset: 'cat', label: `${i}片刻${'长记录'.repeat(20)}`, note: '绝不公开的心情备注' });
  for (const format of ['portrait', 'square']) {
    const pages = poster.layout(state, date, true, format);
    assert.ok(pages.length > 1);
    assert.deepEqual(pages.flat().map((r) => r.lines.join('')), state.events.map((r) => r.label));
    assert.ok(pages.every((rows) => rows.reduce((n, r) => n + r.height, 0) <= (format === 'square' ? 326 : 200)));
    assert.equal(poster.pageCount(state, date, false, format), 1);
    let calls = [], images = [];
    global.wx = {
      createCanvasContext: () => ({ setFontSize() {}, setFillStyle() {}, fillRect() {}, drawImage: (...a) => images.push(a), fillText: (s) => calls.push(s), draw: (_, done) => done() }),
      canvasToTempFilePath: (options) => { assert.equal(options.height, format === 'square' ? 600 : 1050); options.success({ tempFilePath: 'poster.png' }); },
    };
    try {
      poster.draw({}, state, date, false, (err) => assert.ifError(err), 0, format);
      assert.ok(!calls.some((s) => s.includes('长记录') || s.includes('绝不公开')));
      assert.ok(images.some((a) => a[0].includes('-didi.jpg')));
    } finally { delete global.wx; }
  }
});
test('导出失败会传回调用者，空白日不生成弟弟', () => {
  const images = [];
  global.wx = { createCanvasContext: () => ({ setFontSize() {}, setFillStyle() {}, fillRect() {}, fillText() {}, drawImage: (...a) => images.push(a), draw: (_, done) => done() }), canvasToTempFilePath: (o) => o.fail(new Error('fail')) };
  try {
    let error;
    poster.draw({}, energy.empty(), energy.dayKey(Date.now()), true, (err) => { error = err; });
    assert.ok(error);
    assert.ok(!images.some((a) => a[0].includes('didi')));
  } finally { delete global.wx; }
});
