import { chromium } from '@playwright/test';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const mini = path.join(root, 'miniprogram'), out = path.join(root, '.local/wechat');
await mkdir(out, { recursive: true });
const sources = {};
for (const [name, file] of Object.entries({ energy: 'lib/energy.js', storage: 'lib/storage.js', garden: 'lib/garden.js', layout: 'lib/layout.js', poster: 'lib/poster.js', page: 'pages/index/index.js' })) sources[name] = await readFile(path.join(mini, file), 'utf8');
const assets = {};
for (const file of await readdir(path.join(mini, 'assets'))) if (/\.(png|jpg)$/.test(file)) assets['/assets/' + file] = `data:image/${file.endsWith('.png') ? 'png' : 'jpeg'};base64,` + (await readFile(path.join(mini, 'assets', file))).toString('base64');
const compiled = await readFile(path.join(out, 'compiled-wxml.js'), 'utf8');
const styles = await readFile(path.join(mini, 'app.wxss'), 'utf8') + '\n' + await readFile(path.join(mini, 'pages/index/index.wxss'), 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setContent('<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="root"></main></body></html>');
  await page.evaluate(() => { window.__webview_engine_version__ = 0.02; });
  await page.addScriptTag({ content: compiled });
  await page.evaluate(async ({ sources, styles, assets }) => {
    const modules = {}, memory = {}, imageAssets = {};
    for (const [key, src] of Object.entries(assets)) { const img = new Image(); img.src = src; await img.decode(); imageAssets[key] = img; }
    let definition, queued = false, instance;
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 1050;
    let ctx = canvas.getContext('2d');
    const status = { toasts: [], failStorage: false, failAlbum: false, failCanvas: false, clipboard: '', saved: 0, previews: 0 };
    const wx = {
      getStorageSync: (k) => memory[k],
      setStorageSync: (k, v) => { if (status.failStorage) throw new Error('storage full'); memory[k] = JSON.parse(JSON.stringify(v)); },
      showToast: (o) => status.toasts.push(o.title), setNavigationBarTitle() {}, nextTick: (cb) => queueMicrotask(cb),
      getWindowInfo: () => ({ windowWidth: innerWidth, windowHeight: innerHeight, screenHeight: innerHeight, safeArea: { bottom: innerHeight - 34 } }),
      hideKeyboard() {}, pageScrollTo: ({scrollTop}) => window.scrollTo(0,scrollTop),
      showModal: (o) => o.success?.({ confirm: true }), setClipboardData: (o) => { status.clipboard = o.data; o.success?.(); },
      createCanvasContext: () => {
        canvas.height = instance.data.posterHeight; ctx = canvas.getContext('2d');
        return { setFontSize: (size) => { ctx.font = `${size}px "Microsoft YaHei",sans-serif`; }, setFillStyle: (color) => { ctx.fillStyle = color; },
          fillText: (...a) => ctx.fillText(...a), measureText: (...a) => ctx.measureText(...a), fillRect: (...a) => ctx.fillRect(...a),
          drawImage: (src, ...a) => ctx.drawImage(imageAssets[src], ...a),
          set globalCompositeOperation(value) { ctx.globalCompositeOperation = value; }, draw: (_, cb) => cb() };
      },
      canvasToTempFilePath: (o) => status.failCanvas ? o.fail(new Error('canvas failure')) : o.success({ tempFilePath: canvas.toDataURL('image/png') }),
      saveImageToPhotosAlbum: (o) => { if (status.failAlbum) o.fail?.(); else { status.saved++; o.success?.(); } o.complete?.(); },
      previewImage: () => { status.previews++; },
    };
    for (const name of ['energy', 'storage', 'garden', 'layout', 'poster']) {
      const module = { exports: {} };
      new Function('require', 'module', 'exports', 'wx', sources[name])((p) => modules[p.split('/').pop()], module, module.exports, wx);
      modules[name] = module.exports;
    }
    new Function('require', 'Page', 'wx', sources.page)((p) => modules[p.split('/').pop()], (d) => { definition = d; }, wx);
    instance = { ...definition, data: JSON.parse(JSON.stringify(definition.data)), setData(patch) {
      for (const [key, value] of Object.entries(patch)) { const keys = key.split('.'); let obj = this.data; for (const k of keys.slice(0,-1)) { obj[k] ??= {}; obj = obj[k]; } obj[keys.at(-1)] = value; }
      if (!queued) { queued = true; queueMicrotask(() => { queued = false; render(); }); }
    } };
    window.miniPage = instance; window.energy = modules.energy; window.mockStatus = status;
    const style = document.createElement('style'); document.head.append(style);
    const rpx = (s) => s.replace(/([\d.]+)rpx/g, (_, n) => `${Number(n)*innerWidth/750}px`);
    const toDom = (node) => {
      if (node === undefined || node === null) return document.createTextNode('');
      if (typeof node !== 'object') return document.createTextNode(String(node));
      if (node.tag === 'virtual' || node.tag === 'wx-page' || node.tag === 'wx-block') { const f = document.createDocumentFragment(); (node.children || []).forEach((c) => f.append(toDom(c))); return f; }
      const tag = node.tag.replace('wx-','');
      const el = document.createElement(({ view: 'div', text: 'span', image: 'img', slider: 'input', switch: 'input', picker: 'div', 'scroll-view': 'div' })[tag] || tag);
      el.__actions = {};
      for (const eventName of ['click','input','change','load','error']) el.addEventListener(eventName, (event) => {
        const action = el.__actions[eventName];
        if (!action || !el.isConnected) return;
        if (action.stop) event.stopPropagation();
        instance[action.method]({currentTarget:{dataset:el.dataset},detail:{value:el.type === 'checkbox' ? el.checked : el.value}});
      });
      if (tag === 'slider') el.type = 'range'; if (tag === 'switch') el.type = 'checkbox';
      for (const [name,value] of Object.entries(node.attr || {})) {
        if (value === false || value === undefined || value === null) continue;
        if (name === 'src') el.src = assets[value] || value;
        else if (name === 'value' && 'value' in el) el.value = value;
        else if (name === 'checked') el.checked = !!value;
        else if (name === 'class' || name === 'style') el.setAttribute(name, rpx(String(value)));
        else if (name.startsWith('data')) { const key = name.startsWith('data-') ? name.slice(5) : name.slice(4).replace(/^./, (c) => c.toLowerCase()); el.dataset[key] = value; }
        else if (name === 'bindtap' || name === 'catchtap') el.__actions.click = {method:value,stop:name === 'catchtap'};
        else if (name === 'bindload' || name === 'binderror') el.__actions[name === 'bindload' ? 'load' : 'error'] = {method:value};
        else if (['bindinput','bindchange','bindchanging'].includes(name)) el.__actions[name === 'bindchange' ? 'change' : 'input'] = {method:value};
        else if (name === 'disabled') el.disabled = true;
        else if (['placeholder','maxlength','min','max','step','aria-label','id'].includes(name)) el.setAttribute(name,value);
      }
      (node.children || []).forEach((c) => el.append(toDom(c))); return el;
    };
    // Preserve nodes, focus and CSS transitions like the native setData renderer.
    function reconcile(parent, next) {
      const children = [...next.childNodes];
      children.forEach((node,index) => {
        const old = parent.childNodes[index];
        if (!old) { parent.append(node); return; }
        if (old.nodeType !== node.nodeType || old.nodeName !== node.nodeName || (node.nodeType === Node.ELEMENT_NODE && old.classList[0] !== node.classList[0])) { old.replaceWith(node); return; }
        if (old.nodeType === Node.TEXT_NODE) { if (old.data !== node.data) old.data = node.data; return; }
        old.__actions = node.__actions;
        for (const attr of [...old.attributes]) if (!node.hasAttribute(attr.name)) old.removeAttribute(attr.name);
        for (const attr of [...node.attributes]) if (old.getAttribute(attr.name) !== attr.value) old.setAttribute(attr.name,attr.value);
        for (const prop of ['value','checked','disabled']) if (prop in node && old[prop] !== node[prop]) old[prop] = node[prop];
        reconcile(old,node);
      });
      while (parent.childNodes.length > children.length) parent.lastChild.remove();
    }
    function render() {
      const css = rpx(styles.replace(/(?<![\w.-])(page|view|text|image)(?=[\s,{.:>])/g, (t) => ({ page:'body',view:'div',text:'span',image:'img' })[t])) + 'body{margin:0}img{object-fit:contain}button,input,textarea{font-family:inherit}button{border:0;cursor:pointer}button,input,textarea{outline:none}input[type=checkbox]{width:26px;height:26px;accent-color:#202526}';
      if (style.textContent !== css) style.textContent = css;
      const next = document.createElement('div'); next.append(toDom(window.$gwx('pages/index/index.wxml')(instance.data,{},{})));
      reconcile(document.getElementById('root'),next);
    }
    window.renderMini = render; instance.onLoad(); render();
  }, { sources, styles, assets });
  const act = (method, dataset = {}) => page.evaluate(({method,dataset}) => window.miniPage[method]({ currentTarget: { dataset }, detail: { value: dataset.value } }), {method,dataset});
  const read = (key) => page.evaluate((k) => window.miniPage.data[k], key);
  const shot = async (name) => { await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true }); };
  await page.locator('.sheet-title').waitFor();
  assert.equal(await read('value'), null);
  await shot('onboarding-v3');
  await page.locator('.feeling-options [data-id="okay"]').click();
  assert.equal(await read('value'), 60);
  await shot('home-empty-v3');
  await page.locator('.preset[data-id="cat"]').click();
  assert.equal(await page.evaluate(() => window.miniPage.state.events.length), 0);
  await page.locator('.record-submit').click();
  assert.equal(await read('sceneAsset'),'window-0.jpg');
  assert.equal(await read('incomingAsset'),'window-1-didi.jpg');
  await page.waitForFunction(() => window.miniPage.data.sceneRevealing);
  await page.waitForTimeout(450);
  const growthOpacity = await page.locator('.scene-reveal').evaluate((el) => Number(getComputedStyle(el).opacity));
  assert.ok(growthOpacity > 0 && growthOpacity < 1,`Growth has visible intermediate frames: ${growthOpacity}, ${await page.locator('.scene-reveal').evaluate((el) => getComputedStyle(el).transition)}`);
  await shot('garden-growing-v4');
  await page.waitForFunction(() => !window.miniPage.data.incomingAsset);
  assert.equal(await read('sceneAsset'),'window-1-didi.jpg');
  await act('recordSelected');
  assert.equal(await page.evaluate(() => window.miniPage.state.events.length), 1);
  assert.equal(await read('value'), 64);
  assert.equal((await read('homeGarden')).cat, true);
  await act('undoSaved');
  assert.equal(await read('value'), 60);
  assert.equal((await read('homeGarden')).cat, false);
  await act('drinkRecord', { id:'coffee' });
  await page.locator('.editor .primary').click();
  assert.equal(await read('value'), 60);
  assert.equal(await page.evaluate(() => window.miniPage.state.events[0].direction), 0);
  await page.evaluate(() => window.miniPage.newEditor('meal'));
  await act('setMeta', { field:'mealStatus',id:'pending' });
  await page.locator('.editor .primary').click();
  assert.equal(await read('value'),60);
  await page.evaluate(() => window.miniPage.openEditor(window.miniPage.state.events.at(-1)));
  await act('setMeta', {field:'mealStatus',id:'eaten'});
  await act('setMeta', {field:'satisfaction',id:'happy'});
  await page.locator('.editor .primary').click();
  assert.equal(await read('value'),68);
  await page.evaluate(() => window.miniPage.newEditor('work'));
  await page.locator('.editor input[data-field="minutesText"]').fill('480');
  await page.locator('.editor .primary').click();
  assert.equal(await read('value'),68);
  assert.equal(await page.evaluate(() => window.miniPage.state.events.at(-1).minutes),480);
  await act('selectPreset',{id:'cat'}); await act('recordSelected');
  await act('clearMotion');
  await shot('home-v3');
  await act('switchView',{view:'history'});
  assert.ok((await page.locator('.day').count()) >= 28);
  await shot('calendar-v3');
  await act('changeMonth',{delta:-1});
  assert.equal((await read('selectedDate')).slice(0,7).replace('-','.'),await read('monthLabel'));
  await act('changeMonth',{delta:1});
  await act('openDay'); await shot('day-detail-v3'); await act('closeSheet');
  await act('switchView',{view:'share'});
  await page.locator('.poster-image').waitFor();
  await shot('share-v3');
  const firstPoster = await read('posterPath');
  await writeFile(path.join(out,'poster-v3.png'),Buffer.from(firstPoster.split(',')[1],'base64'));
  await page.locator('.privacy input[type=checkbox]').uncheck();
  assert.equal(await read('showNames'),false);
  assert.notEqual(await read('posterPath'),firstPoster);
  await page.locator('.privacy input[type=checkbox]').check();
  await act('changeFormat',{value:'square'});
  assert.equal(await read('posterHeight'),600);
  await shot('share-square-v3');
  await page.evaluate(() => {
    const m = window.miniPage, e = window.energy;
    for (let i = 0; i < 15; i++) m.state = e.addEvent(m.state,{preset:'work',label:`${i} ${'这是较长的工作记录'.repeat(7)}`,note:'PRIVATE-NOTE'});
    m.commit(m.state);
  });
  assert.ok((await read('posterPages')) > 2);
  await act('changePosterPage',{delta:1});
  assert.equal(await read('posterPage'),1);
  await shot('share-long-v3');
  await page.evaluate(() => { window.mockStatus.failCanvas = true; window.miniPage.makePoster(); });
  assert.equal(await read('posterError'),true);
  await page.evaluate(() => { window.mockStatus.failCanvas = false; window.miniPage.makePoster(); });
  await page.locator('.poster-image').waitFor();
  await page.evaluate(() => { window.mockStatus.failAlbum = true; window.miniPage.savePoster(); });
  assert.equal(await page.evaluate(() => window.mockStatus.saved),0);
  assert.ok(await page.evaluate(() => window.mockStatus.previews > 0));
  await page.evaluate(() => { window.mockStatus.failAlbum = false; window.miniPage.savePoster(); });
  assert.equal(await page.evaluate(() => window.mockStatus.saved),1);
  await act('switchView',{view:'home'});
  await page.evaluate(() => { window.miniPage.commit(window.energy.calibrate(window.miniPage.state,0)); window.mockStatus.failStorage = true; });
  const count = await page.evaluate(() => window.miniPage.state.events.length);
  await act('selectPreset',{id:'work'}); await act('recordSelected');
  assert.equal(await page.evaluate(() => window.miniPage.state.events.length),count);
  assert.equal(await read('motion'),'');
  await page.evaluate(() => { window.mockStatus.failStorage = false; });
  await act('recordSelected'); await act('clearMotion');
  assert.equal(await read('value'),-10);
  await shot('overdraft-v3');
  await act('startTimer'); await act('stopTimer'); await act('setDirection',{value:0}); await act('saveEditor');
  assert.equal(await read('value'),-10);
  assert.equal(await page.evaluate(() => window.miniPage.state.timer),null);
  await page.evaluate(() => window.miniPage.changeMotion({detail:{value:true}}));
  await act('selectPreset',{id:'cat'}); await act('recordSelected');
  assert.equal(await read('motion'),'');
  await act('exportBackup');
  assert.equal(await page.evaluate(() => JSON.parse(window.mockStatus.clipboard).settings.reducedMotion),true);
  await act('restoreBackup');
  await page.evaluate(() => window.miniPage.setData({restoreText:window.mockStatus.clipboard})); await act('confirmRestore');
  assert.equal(await read('stateError'),'');
  for (const width of [320,375,393,430,440,768]) {
    const height = width === 440 ? 956 : width === 393 ? 852 : 844;
    await page.setViewportSize({width,height});
    await page.evaluate(() => window.miniPage.syncViewport());
    for (const view of ['home','history','share']) {
      await act('switchView',{view});
      if (view === 'share') await page.locator('.poster-image').waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`${view} overflow at ${width}`);
      if (width !== 768) await shot(`${view}-${width}-v3`);
    }
    for (let repeat = 0; repeat < 3; repeat++) {
      await act('switchView',{view:'home'});
      const heroBefore = await page.locator('.home-hero').boundingBox();
      await act('customRecord');
      await page.locator('.title-input').fill('下班路上淋了雨');
      assert.equal(await read('editor').then((e) => e.label),'下班路上淋了雨');
      assert.equal(await page.locator('.title-input').inputValue(),'下班路上淋了雨');
      assert.ok(await page.locator('.title-input').evaluate((el) => el.clientHeight >= 48 && getComputedStyle(el).color === 'rgb(32, 37, 38)'));
      await page.evaluate(() => window.miniPage.keyboardChange({detail:{height:336}}));
      const dialog = await page.locator('.sheet').boundingBox();
      assert.ok(dialog.y >= 0 && dialog.y + dialog.height <= height - 336 + 1,`keyboard clearance at ${width}`);
      if (repeat === 0 && [393,440].includes(width)) await shot(`editor-keyboard-${width}-v4`);
      await page.evaluate(() => window.miniPage.onResize({size:{windowWidth:innerWidth,windowHeight:innerHeight-336}}));
      await page.evaluate(() => window.miniPage.keyboardChange({detail:{height:0}}));
      assert.equal(await read('overlayHeight'),height);
      await act('closeSheet');
      const heroAfter = await page.locator('.home-hero').boundingBox();
      assert.equal(heroAfter.height,heroBefore.height);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),`editor overflow at ${width}`);
      await act('switchView',{view:'history'}); await act('switchView',{view:'home'});
      assert.equal((await page.locator('.home-hero').boundingBox()).height,heroBefore.height);
    }
  }
  assert.equal(await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length),0);
  await page.evaluate(() => { window.miniPage.onShow(); window.miniPage.onHide(); window.miniPage.onUnload(); });
  assert.deepEqual(errors,[]);
  console.log('PASS compiled-WXML browser harness: recording, growth intermediate frames, typed title, repeat keyboard/dialog/navigation cycles, poster/privacy/failures, and 320/375/393/430/440/768 widths. Mocked wx APIs; real-device checks still required.');
} finally { await browser.close(); }
