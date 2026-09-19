import automator from 'miniprogram-automator';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = new URL('../.local/wechat/', import.meta.url);
await mkdir(out, { recursive: true });
const app = await automator.connect({ wsEndpoint: process.env.WECHAT_AUTOMATION_URL || 'ws://127.0.0.1:9420' });
const errors = [];
app.on('exception', (e) => errors.push(e));
const deadline = setTimeout(() => { app.disconnect(); console.error('Simulator smoke timed out'); process.exitCode = 1; }, 90000);
try {
  let page = await app.reLaunch('/pages/index/index');
  assert.ok(page);
  await page.waitFor('.masthead');
  console.log('Loaded real WeChat page:', page.path);
  // All test events stay in page memory. Never replace the user's device storage.
  await app.evaluate(() => {
    const p = getCurrentPages()[0];
    p.onHide();
    p.originalCommitForSmoke = p.commit;
    p.commit = function(state) { this.state = state; this.refresh(); return true; };
    p.state = { version: 3, modelStart: null, originValue: null, originAt: null, seq: 1, calibrations: [{ id:'test-feeling',seq:1,at:Date.now()-7200000,value:60 }], events:[],timer:null,settings:{reducedMotion:false} };
    p.setData({ sheet:'',selectedPreset:'',lastAdded:'' }); p.refresh();
  });
  assert.equal(await page.data('value'),54);
  assert.equal(await page.data('estimateText'),'随时间与记录估算');
  await app.evaluate(() => {
    const p = getCurrentPages()[0]; p.state.calibrations[0].at = Date.now()-60000; p.refresh();
  });
  await (await page.$('.preset[data-id="cat"]')).tap();
  assert.equal(await page.data('value'),60);
  await (await page.$('.record-submit')).tap();
  await page.waitFor(async () => await page.data('sceneRevealing'));
  assert.equal(await page.data('sceneAsset'),'window-0.jpg');
  assert.equal(await page.data('incomingAsset'),'window-1-didi.jpg');
  await app.screenshot({path:fileURLToPath(new URL('wechat-growth-v4.png',out))});
  await page.waitFor(async () => !(await page.data('incomingAsset')));
  assert.equal(await page.data('value'),64);
  assert.equal((await page.data('homeGarden')).cat,true);
  const homeWidth = Number((await (await page.$('.home')).size()).width);
  const submitWidth = Number((await (await page.$('.primary')).size()).width);
  assert.ok(submitWidth >= homeWidth - 2, `Native submit width ${submitWidth} vs ${homeWidth}`);
  assert.ok(Number((await (await page.$('.masthead .icon-button')).size()).width) <= 45);
  for (const id of ['work','meal','social']) {
    await page.callMethod('saveNew',{preset:id});
  }
  await page.callMethod('clearMotion');
  assert.equal(await app.evaluate(() => getCurrentPages()[0].state.events.length),4);
  await page.waitFor(250);
  const recentText = await (await page.$('.recent-name')).text();
  assert.ok(recentText.includes('人际支出'),`Native recent-record binding: ${recentText}`);
  await app.screenshot({path:fileURLToPath(new URL('wechat-home-v4.png',out))});
  await page.callMethod('switchView',{currentTarget:{dataset:{view:'history'}}});
  assert.ok((await page.$$('.day')).length >= 28);
  const calendarWidth = Number((await (await page.$('.calendar')).size()).width);
  assert.ok(Number((await (await page.$('.day')).size()).width) <= calendarWidth / 7 + 1);
  await app.pageScrollTo(0);
  await app.screenshot({path:fileURLToPath(new URL('wechat-calendar-v4.png',out))});
  await page.callMethod('switchView',{currentTarget:{dataset:{view:'share'}}});
  await page.waitFor(async () => !(await page.data('busy')));
  assert.equal(await page.data('posterError'),false);
  const posterPath = await page.data('posterPath');
  assert.ok(posterPath);
  console.log('Actual WeChat canvas image export succeeded.');
  const png = await app.evaluate((filePath) => wx.getFileSystemManager().readFileSync(filePath, 'base64'), posterPath);
  await writeFile(new URL('wechat-poster-v4.png',out),Buffer.from(png,'base64'));
  await app.screenshot({path:fileURLToPath(new URL('wechat-share-v4.png',out))});
  await page.callMethod('changeFormat',{currentTarget:{dataset:{value:'square'}}});
  await page.waitFor(async () => !(await page.data('busy')));
  assert.equal(await page.data('posterHeight'),600);
  assert.equal(await page.data('posterError'),false);
  await app.screenshot({path:fileURLToPath(new URL('wechat-square-v4.png',out))});
  await page.callMethod('privacyChange',{detail:{value:false}});
  await page.waitFor(async () => !(await page.data('busy')));
  assert.equal(await page.data('showNames'),false);
  await page.callMethod('switchView',{currentTarget:{dataset:{view:'home'}}});
  await page.callMethod('newEditor','meal');
  await app.screenshot({path:fileURLToPath(new URL('wechat-meal-v4.png',out))});
  await page.callMethod('closeSheet');
  const sceneHeight = Number((await (await page.$('.home-hero')).size()).height);
  for (let cycle=0;cycle<3;cycle++) {
    await page.callMethod('customRecord');
    const title = await page.$('.title-input');
    await title.input('下班路上淋了雨');
    await page.waitFor(async () => (await page.data('editor')).label === '下班路上淋了雨');
    assert.equal(await title.value(),'下班路上淋了雨');
    assert.equal((await page.data('editor')).label,'下班路上淋了雨');
    assert.ok(Number((await title.size()).height) >= 48);
    await page.callMethod('keyboardChange',{detail:{height:336}});
    await page.waitFor(100);
    const sheet = await page.$('.sheet');
    assert.ok(Number((await sheet.offset()).top) >= 0);
    if (cycle === 0) await app.screenshot({path:fileURLToPath(new URL('wechat-input-keyboard-v4.png',out))});
    await page.callMethod('keyboardChange',{detail:{height:0}});
    if (cycle === 2) {
      await app.screenshot({path:fileURLToPath(new URL('wechat-custom-input-v4.png',out))});
      await page.callMethod('saveEditor');
      assert.ok((await page.data('recentText')).includes('下班路上淋了雨'));
      assert.ok((await (await page.$('.recent-name')).text()).includes('下班路上淋了雨'));
    } else await page.callMethod('closeSheet');
    await page.callMethod('switchView',{currentTarget:{dataset:{view:'history'}}});
    await page.callMethod('switchView',{currentTarget:{dataset:{view:'home'}}});
    assert.equal(Number((await (await page.$('.home-hero')).size()).height),sceneHeight);
  }
  assert.deepEqual(errors,[]);
  await writeFile(new URL('simulator-results.json',out),JSON.stringify({time:new Date().toISOString(),passed:true,checks:['real WXML UI','select then single save','growth transition','calendar','native canvas portrait/square export','privacy toggle','typed custom title','three keyboard-height/dialog/navigation cycles'],storageWrites:false,phonePermissionsTested:false,physicalIOSKeyboardTested:false},null,2));
} finally {
  try {
    await app.evaluate(() => {
      const p = getCurrentPages()[0];
      p.onHide();
      if (p.originalCommitForSmoke) { p.commit = p.originalCommitForSmoke; delete p.originalCommitForSmoke; }
      p.setData({view:'home',sheet:'',selectedPreset:'',lastAdded:'',feedback:''});
      p.onLoad(); p.onShow();
    });
  } finally { clearTimeout(deadline); app.disconnect(); }
}
console.log('PASS real WeChat simulator smoke. User storage untouched; original page restored; album/clipboard permissions not invoked.');
