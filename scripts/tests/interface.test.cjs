const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const energy = require('../../miniprogram/lib/energy');
const { layout } = require('../../miniprogram/lib/layout');

function setup() {
  let page, clock = 0, sequence = 0, stored = energy.empty();
  const timers = new Map();
  const later = (fn, delay, repeat = false) => { const id = ++sequence; timers.set(id, { fn, at: clock + delay, delay, repeat }); return id; };
  const context = {
    require: (name) => name.endsWith('/storage') ? { read: () => ({ state: stored }), save: (state) => { stored = state; return state; } } : require('../../miniprogram/lib/' + name.split('/').pop()),
    Page: (definition) => { page = definition; },
    wx: { getWindowInfo: () => ({ windowWidth: 393, windowHeight: 759, screenHeight: 852, safeArea: { bottom: 818 } }), setNavigationBarTitle() {}, showToast() {}, hideKeyboard() {}, nextTick: (fn) => fn() },
    setTimeout: later, clearTimeout: (id) => timers.delete(id), setInterval: (fn, delay) => later(fn, delay, true), clearInterval: (id) => timers.delete(id),
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../../miniprogram/pages/index/index.js'), 'utf8'), context);
  page.setData = function(patch) {
    for (const [key,value] of Object.entries(patch)) {
      const keys = key.split('.'); let obj = this.data;
      for (const part of keys.slice(0,-1)) obj = obj[part];
      obj[keys.at(-1)] = value;
    }
  };
  page.onLoad(); page.state = energy.calibrate(page.state,60); page.refresh(); page.closeSheet();
  function advance(ms) {
    const end = clock + ms;
    while (true) {
      const next = [...timers].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
      if (!next) break;
      const [id,t] = next; clock = t.at;
      if (t.repeat) t.at += t.delay; else timers.delete(id);
      t.fn();
    }
    clock = end;
  }
  return { page, advance };
}

test('garden keeps old image until load, then completes growth after number animation', () => {
  const { page, advance } = setup();
  page.saveNew({preset:'cat'});
  assert.equal(page.data.sceneAsset,'window-0.jpg');
  assert.equal(page.data.incomingAsset,'window-1-didi.jpg');
  page.sceneLoaded(); advance(100);
  assert.equal(page.data.sceneRevealing,true);
  advance(1100);
  assert.equal(page.data.sceneAsset,'window-0.jpg');
  assert.equal(page.data.displayNumber,'64');
  advance(1000);
  assert.equal(page.data.incomingAsset,'');
  assert.equal(page.data.sceneAsset,'window-1-didi.jpg');
});

test('rapid records and leaving page cannot replay a stale garden', () => {
  const { page, advance } = setup();
  page.saveNew({preset:'cat'}); page.sceneLoaded(); advance(300);
  page.saveNew({preset:'work'}); page.sceneLoaded(); advance(2300);
  assert.equal(page.data.sceneAsset,'window-2-didi.jpg');
  page.saveNew({preset:'meal'}); page.onHide(); advance(6000);
  assert.equal(page.data.incomingAsset,'');
  assert.equal(page.data.sceneAsset,page.data.homeGarden.asset);
});

test('same-stage records respond, while reduced motion and save failures do not', () => {
  const { page, advance } = setup();
  for (let i=0;i<5;i++) { page.saveNew({preset:'work'}); page.clearMotion(); }
  page.saveNew({preset:'work'}); advance(100);
  assert.equal(page.data.sceneBreathing,true);
  advance(2200); assert.equal(page.data.sceneBreathing,false);
  page.state.settings.reducedMotion = true; page.refresh();
  page.saveNew({preset:'cat'});
  assert.equal(page.data.incomingAsset,'');
  assert.equal(page.data.sceneAsset,'window-3-didi.jpg');
  page.state.settings.reducedMotion = false; page.refresh();
  const asset = page.data.sceneAsset;
  page.commit = () => false; page.saveNew({preset:'work'}); advance(5000);
  assert.equal(page.data.sceneAsset,asset); assert.equal(page.data.motion,'');
});

test('keyboard open/close never shrinks next editor or scene across repeated cycles', () => {
  const { page } = setup();
  for (let i=0;i<8;i++) {
    page.customRecord();
    page.inputField({currentTarget:{dataset:{field:'label'}},detail:{value:'今天挤地铁，很累'}});
    page.keyboardChange({detail:{height:336}});
    assert.equal(page.data.overlayHeight,423);
    page.onResize({size:{windowWidth:393,windowHeight:423}});
    page.keyboardChange({detail:{height:0}});
    assert.equal(page.data.overlayHeight,759);
    assert.equal(page.data.editor.label,'今天挤地铁，很累');
    page.closeSheet();
    assert.equal(page.data.sceneSize,393);
  }
  page.customRecord();
  page.inputField({currentTarget:{dataset:{field:'label'}},detail:{value:'我自己的经历'}});
  page.saveEditor();
  assert.ok(page.data.recentText.endsWith('我自己的经历'));
});

test('layout keeps dialog inside available area on small and large phones', () => {
  for (const [w,h] of [[320,568],[393,759],[440,863]]) {
    for (const keyboard of [0,291,336,390]) {
      const l = layout(w,h,keyboard,34);
      assert.equal(l.sceneSize,w);
      assert.ok(l.sheetHeight < l.overlayHeight);
      assert.ok(l.sheetScrollHeight + 76 + l.sheetBottom <= l.sheetHeight);
    }
  }
});

test('foreground minute refresh updates elapsed energy without adding an event', () => {
  const { page, advance } = setup();
  page.onShow();
  page.state.calibrations[0].at -= 2 * 3600000;
  page.lastRefreshMinute = -1;
  advance(1000);
  assert.ok(page.data.value < 60);
  assert.equal(page.data.value,energy.battery(page.state).value);
  assert.equal(page.state.events.length,0);
  page.onHide();
});
