const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const garden = require('../../miniprogram/lib/garden');
const energy = require('../../miniprogram/lib/energy');

test('daily template rotation is stable, preserves old diaries and crosses months/years', () => {
  assert.equal(garden.templateForDate('2026-09-18'), 'window');
  const start = Date.UTC(2026,8,19);
  for (let i = 0; i < 500; i++) {
    const date = new Date(start + i * 86400000).toISOString().slice(0,10);
    assert.equal(garden.templateForDate(date), ['peony','iris','tulip','window'][i % 4]);
    assert.equal(garden.forDay(energy.empty(),date).template, garden.templateForDate(date));
  }
  for (const date of [null,'','2026-02-30','2026-13-01','2026-9-19']) assert.equal(garden.templateForDate(date),'window');
});

test('all directions grow every template; cat presence and undo do not change the template', () => {
  for (const date of ['2026-09-19','2026-09-20','2026-09-21','2026-09-22']) {
    const at = new Date(`${date}T12:00:00`).getTime();
    const template = garden.templateForDate(date);
    let state = energy.empty();
    for (let count = 0; count <= 6; count++) {
      if (count) state.events.push({id:`event-${count}`,at,seq:count,preset:count === 5 ? 'cat' : 'work',direction:count % 3 - 1,points:0});
      const scene = garden.forDay(state,date);
      const stage = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
      assert.equal(scene.asset,`${template}-${stage}${count >= 5 ? '-didi' : ''}.jpg`);
      assert.equal(scene.count,count);
    }
    state.events = state.events.filter((e) => e.preset !== 'cat');
    assert.equal(garden.forDay(state,date).asset,`${template}-3.jpg`);
    assert.equal(garden.forDay(state,'2026-09-18').cat,false);
  }
});

test('all 32 scene variants exist locally and fit the mini-program package budget', () => {
  const root = path.resolve(__dirname,'../../miniprogram');
  assert.equal(new Set(garden.ASSETS).size,32);
  for (const name of garden.ASSETS) {
    const bytes = fs.readFileSync(path.join(root,'assets',name));
    assert.ok(bytes.length > 10000,name);
    assert.equal(bytes.readUInt16BE(0),0xffd8,name);
  }
  const total = (dir) => fs.readdirSync(dir,{withFileTypes:true}).reduce((size,entry) => {
    const file = path.join(dir,entry.name);
    return size + (entry.isDirectory() ? total(file) : fs.statSync(file).size);
  },0);
  assert.ok(total(root) < 2 * 1024 * 1024,'Keep all scenes offline inside the existing package budget');
});
