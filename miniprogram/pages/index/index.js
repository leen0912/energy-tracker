const energy = require('../../lib/energy');
const storage = require('../../lib/storage');
const garden = require('../../lib/garden');
const poster = require('../../lib/poster');
const { layout } = require('../../lib/layout');
const message = (title) => wx.showToast({ title, icon: 'none', duration: 2200 });
const ds = (e) => e.currentTarget.dataset;
const duration = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((n) => String(n).padStart(2, '0')).join(':');
};
Page({
  data: {
    view: 'home', sheet: '', stateError: '', value: null, displayNumber: '—', date: '', today: '',
    feelings: energy.FEELINGS, mode: 1, selectedPreset: '', selectedLabel: '',
    presets: energy.PRESETS.filter((p) => p.direction === 1).slice(0, 4),
    drinks: energy.PRESETS.filter((p) => p.direction === 0),
    levels: [{ id: '', label: '随这段经历' }, { id: 'light', label: '一点' }, { id: 'normal', label: '明显' }, { id: 'heavy', label: '很多' }],
    mealStatuses: [{ id: 'eaten', label: '吃了' }, { id: 'pending', label: '还没吃' }, { id: 'skipped', label: '这顿没吃' }],
    fullnesses: [{ id: '', label: '不选' }, { id: 'hungry', label: '没吃饱' }, { id: 'enough', label: '刚好' }, { id: 'full', label: '有点撑' }],
    satisfactions: [{ id: '', label: '不选' }, { id: 'ordinary', label: '普通' }, { id: 'happy', label: '吃美了' }],
    directions: [{ value: 1, label: '补充' }, { value: -1, label: '消耗' }, { value: 0, label: '只是记一下' }],
    recentText: '还没有记录，也不着急。', homeGarden: { asset: 'window-0.jpg', cat: false, count: 0 }, historyGarden: { asset: 'window-0.jpg', cat: false, count: 0 },
    cells: [], weekdays: ['一', '二', '三', '四', '五', '六', '日'], monthLabel: '', selectedDate: '', historyEvents: [],
    editor: {}, editingId: '', timer: null, timerFinishing: false, timerText: '00:00:00',
    showNames: true, posterPage: 0, posterPages: 1, posterPath: '', posterFormat: 'portrait', posterHeight: 1050,
    busy: false, posterError: false, restoreText: '', motion: '', reducedMotion: false,
    lastAdded: '', feedback: '',
    ...layout(375, 700), sceneAsset: 'window-0.jpg', incomingAsset: '', sceneRevealing: false,
    sceneBreathing: false, keyboardHeight: 0, focusedField: '',
  },
  onLoad() {
    this.syncViewport();
    wx.setNavigationBarTitle({ title: '日迹' });
    const result = storage.read();
    this.state = result.state;
    const now = new Date();
    this.month = new Date(now.getFullYear(), now.getMonth(), 1);
    this.setData({ stateError: result.error || '', selectedDate: energy.dayKey(now) });
    this.refresh();
    if (energy.battery(this.state).initial && !result.error) this.openCalibration();
  },
  onShow() {
    this.syncViewport();
    clearInterval(this.timerInterval);
    if (this.state) this.refresh();
    this.timerInterval = setInterval(() => {
      if (!this.state) return;
      if (this.state.timer) this.setData({ timerText: duration(Date.now() - this.state.timer.start) });
      if (this.todayKey !== energy.dayKey(Date.now()) || this.data.stale !== energy.battery(this.state).stale) this.refresh();
    }, 1000);
  },
  onHide() { this.clearMotion(); clearInterval(this.timerInterval); },
  onUnload() { this.onHide(); this.unloaded = true; },
  syncViewport(size) {
    const info = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : {};
    const width = (size && size.windowWidth) || info.windowWidth || 375;
    const height = (size && size.windowHeight) || info.windowHeight || 700;
    // A keyboard resize must not become the next dialog's baseline height.
    if (!this.viewport || !this.data.sheet || width !== this.viewport.width) {
      this.viewport = { width, height, safeBottom: info.safeArea ? Math.max(0, info.screenHeight - info.safeArea.bottom) : 0 };
    }
    this.updateLayout();
  },
  onResize(e) { this.syncViewport(e.size); },
  updateLayout(keyboard = this.data.keyboardHeight) {
    const v = this.viewport || { width: 375, height: 700, safeBottom: 0 };
    this.setData({ ...layout(v.width, v.height, keyboard, v.safeBottom), keyboardHeight: keyboard });
  },
  keyboardChange(e) {
    if (!this.data.sheet) return;
    this.updateLayout(Number(e.detail.height) || 0);
    this.scrollInputIntoView();
  },
  inputFocus(e) {
    this.inputAnchor = `field-${String(ds(e).field || 'restore').replace('.', '-')}`;
    if (e.detail.height) this.updateLayout(e.detail.height);
    this.scrollInputIntoView();
  },
  scrollInputIntoView() {
    if (!this.data.keyboardHeight || !this.inputAnchor) return;
    this.setData({ focusedField: '' });
    wx.nextTick(() => { if (this.data.sheet) this.setData({ focusedField: this.inputAnchor }); });
  },
  setSheet(sheet, patch = {}) {
    if (!this.data.sheet) this.syncViewport();
    if (!sheet && typeof wx.hideKeyboard === 'function') wx.hideKeyboard({ fail() {} });
    this.inputAnchor = '';
    this.setData({ sheet, focusedField: '', ...patch });
    this.updateLayout(0);
    if (sheet) wx.nextTick(() => { if (this.data.sheet === sheet) this.setData({ focusedField: 'sheet-start' }); });
  },
  commit(next) {
    try { this.state = storage.save(next); this.refresh(); return true; }
    catch (e) { message(e.message || '没有保存成功，请检查存储空间'); return false; }
  },
  refresh() {
    const now = Date.now(), today = energy.dayKey(now), result = energy.battery(this.state, now);
    this.todayKey = today;
    const toRow = (e) => ({ ...e, time: energy.timeText(e.at), icon: energy.PRESETS.find((p) => p.id === e.preset).icon,
      duration: e.minutes === undefined ? '' : `${e.minutes} 分钟`, directionText: e.direction > 0 ? '补充' : e.direction < 0 ? '消耗' : '留下一笔' });
    const first = this.month, offset = (first.getDay() + 6) % 7;
    const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate(), cells = [];
    const byDate = {};
    this.state.events.forEach((e) => { const k = energy.dayKey(e.at); (byDate[k] || (byDate[k] = [])).push(e); });
    for (let i = 0; i < Math.ceil((offset + count) / 7) * 7; i++) {
      const d = new Date(first.getFullYear(), first.getMonth(), i - offset + 1), key = energy.dayKey(d), outside = d.getMonth() !== first.getMonth();
      cells.push({ key, day: d.getDate(), outside, future: key > today, selected: key === this.data.selectedDate, today: key === today,
        marker: !outside && key <= today ? garden.marker((byDate[key] || []).slice().sort((a, b) => a.at - b.at || a.seq - b.seq)) : '' });
    }
    const events = energy.daily(this.state, today).events.slice().reverse().map(toRow);
    const homeGarden = garden.forDay(this.state, today);
    this.setData({ today, date: `${new Date(now).getMonth() + 1}月${new Date(now).getDate()}日 · ${['周日','周一','周二','周三','周四','周五','周六'][new Date(now).getDay()]}`,
      value: result.value, displayNumber: result.value === null ? '—' : String(Math.abs(result.value)), numberSize: result.value !== null && Math.abs(result.value) >= 1000 ? 'compact-number' : result.value !== null && Math.abs(result.value) >= 100 ? 'medium-number' : '', overdraft: result.value !== null && result.value < 0,
      stale: result.stale, batteryLabel: result.initial ? '从此刻开始' : result.stale ? '上次估计' : result.value < 0 ? '有些透支' : '此刻余量',
      lastTime: result.lastAt ? `${energy.dayKey(result.lastAt)} ${energy.timeText(result.lastAt)}` : '',
      moodCopy: result.initial ? '现在的你，也可以是起点。' : result.stale ? '日子继续，按此刻的感受来。' : result.value < 30 ? '今天已经经历了不少。' : result.value < 65 ? '这一会儿，也算数。' : '有一点余裕，挺好。',
      recentText: events.length ? `${events[0].time} · ${events[0].label}` : '还没有记录，也不着急。',
      homeGarden, historyGarden: garden.forDay(this.state, this.data.selectedDate),
      ...(!this.holdScene ? { sceneAsset: homeGarden.asset } : {}),
      historyEvents: energy.daily(this.state, this.data.selectedDate).events.slice().reverse().map(toRow),
      monthLabel: `${first.getFullYear()}.${String(first.getMonth() + 1).padStart(2, '0')}`, cells,
      reducedMotion: this.state.settings.reducedMotion, timer: this.state.timer, timerText: this.state.timer ? duration(now - this.state.timer.start) : '00:00:00',
    });
    if (this.data.view === 'share') this.makePoster();
  },
  switchView(e) {
    this.clearMotion();
    const view = ds(e).view;
    this.setSheet('', { view });
    if (typeof wx.pageScrollTo === 'function') wx.pageScrollTo({ scrollTop: 0, duration: 0 });
    wx.setNavigationBarTitle({ title: view === 'home' ? '日迹' : view === 'history' ? '日迹 · 日历' : '日迹 · 回响' });
    if (view === 'share') this.makePoster();
  },
  changeMode(e) {
    const mode = Number(ds(e).value);
    const presets = energy.PRESETS.filter((p) => p.direction === mode);
    this.setData({ mode, selectedPreset: '', selectedLabel: '', presets: mode === 1 ? presets.slice(0, 4) : presets });
  },
  selectPreset(e) {
    const preset = energy.PRESETS.find((p) => p.id === ds(e).id);
    if (preset) this.setData({ selectedPreset: preset.id, selectedLabel: preset.label, feedback: '' });
  },
  recordSelected() {
    if (!this.data.selectedPreset) return;
    const preset = this.data.selectedPreset;
    this.saveNew({ preset, ...(preset === 'meal' ? { meta: { mealStatus: 'eaten' } } : {}) });
  },
  saveNew(input) {
    if (this.saving) return;
    this.saving = true;
    try {
      const before = energy.battery(this.state).value;
      const next = energy.addEvent(this.state, input);
      this.clearMotion();
      this.holdScene = !this.data.reducedMotion && energy.dayKey(next.events[next.events.length - 1].at) === this.todayKey;
      if (this.commit(next)) {
        const entry = next.events[next.events.length - 1];
        this.setSheet('', { selectedPreset: '', selectedLabel: '', lastAdded: entry.id, feedback: '这一段，留下了。' });
        this.animateRecord(entry, before);
      }
    } catch (e) { message(e.message); } finally { this.holdScene = false; this.saving = false; }
  },
  clearMotion() {
    clearTimeout(this.motionTimeout); clearTimeout(this.sceneStart); clearTimeout(this.sceneEnd); clearInterval(this.numberTimer);
    this.sceneToken = (this.sceneToken || 0) + 1;
    this.sceneTransitionStarted = false;
    if (this.state) this.setData({ motion: '', incomingAsset: '', sceneRevealing: false, sceneBreathing: false,
      sceneAsset: this.data.homeGarden.asset, displayNumber: this.data.value === null ? '—' : String(Math.abs(this.data.value)) });
  },
  animateRecord(entry, before) {
    if (energy.dayKey(entry.at) !== this.todayKey || this.data.reducedMotion) return;
    const after = this.data.value, changed = before !== null && after !== null && before !== after;
    this.setData({ motion: changed ? after > before ? 'charge' : 'drain' : 'record' });
    const target = this.data.homeGarden.asset;
    if (target !== this.data.sceneAsset) {
      this.setData({ incomingAsset: target, sceneRevealing: false });
      // The old picture remains visible until the new image has decoded.
      this.sceneEnd = setTimeout(() => this.sceneFailed(), 5000);
    } else {
      const token = this.sceneToken;
      this.sceneStart = setTimeout(() => {
        if (token === this.sceneToken) this.setData({ sceneBreathing: true });
      }, 50);
      this.sceneEnd = setTimeout(() => this.setData({ sceneBreathing: false }), 1900);
    }
    if (changed) {
      let step = 0;
      this.numberTimer = setInterval(() => {
        step++;
        this.setData({ displayNumber: String(Math.abs(Math.round(before + (after - before) * step / 6))) });
        if (step >= 6) clearInterval(this.numberTimer);
      }, 70);
    }
    this.motionTimeout = setTimeout(() => this.setData({ motion: '' }), 1100);
  },
  sceneLoaded(e) {
    if (!this.data.incomingAsset || this.sceneTransitionStarted || (e && ds(e).asset !== this.data.incomingAsset)) return;
    this.sceneTransitionStarted = true;
    clearTimeout(this.sceneEnd);
    const token = this.sceneToken;
    this.sceneStart = setTimeout(() => {
      if (token !== this.sceneToken) return;
      this.setData({ sceneRevealing: true });
      this.sceneEnd = setTimeout(() => {
        if (token !== this.sceneToken) return;
        this.setData({ sceneAsset: this.data.incomingAsset, incomingAsset: '', sceneRevealing: false });
      }, 1900);
    }, 60);
  },
  sceneFailed() {
    clearTimeout(this.sceneEnd);
    this.setData({ incomingAsset: '', sceneRevealing: false, sceneAsset: this.data.homeGarden.asset });
  },
  undoSaved() {
    const entry = this.state.events.find((e) => e.id === this.data.lastAdded);
    if (entry && this.commit(energy.removeEvent(this.state, entry.id))) {
      this.clearMotion(); this.setData({ lastAdded: '', feedback: '已撤销。' });
    }
  },
  editEntry(e) {
    const entry = this.state.events.find((x) => x.id === ds(e).id);
    if (entry) this.openEditor(entry);
  },
  newEditor(presetId, custom = false) {
    const p = energy.PRESETS.find((x) => x.id === presetId) || energy.PRESETS[0];
    this.openEditor({ preset: p.id, label: custom ? '' : p.label, direction: custom ? this.data.mode : p.direction, note: '', at: Date.now(), meta: p.id === 'meal' ? { mealStatus: 'eaten' } : {} });
  },
  selectedDetails() { if (this.data.selectedPreset) this.newEditor(this.data.selectedPreset); },
  customRecord() { this.newEditor(this.data.mode === -1 ? 'unexpected' : 'rest', true); },
  drinkRecord(e) { this.newEditor(ds(e).id); },
  openDrinks() { this.setSheet('drinks'); },
  openEditor(entry) {
    this.weightDirty = false; this.timeEdited = false;
    this.setSheet('editor', { editingId: entry.id || '', timerFinishing: false,
      editor: { ...entry, date: energy.dayKey(entry.at), time: energy.timeText(entry.at), minutesText: entry.minutes === undefined ? '' : String(entry.minutes), impact: entry.impact || '', meta: { ...entry.meta } } });
  },
  inputField(e) {
    const field = ds(e).field;
    if (['date', 'time'].includes(field)) this.timeEdited = true;
    if (field === 'minutesText') this.weightDirty = true;
    this.setData({ ['editor.' + field]: e.detail.value });
  },
  setDirection(e) { this.weightDirty = true; this.setData({ 'editor.direction': Number(ds(e).value) }); },
  setLevel(e) { this.weightDirty = true; this.setData({ 'editor.impact': ds(e).id }); },
  setMeta(e) {
    const { field, id } = ds(e);
    this.weightDirty = true;
    const patch = { ['editor.meta.' + field]: id };
    if (field === 'mealStatus') {
      patch['editor.direction'] = id === 'eaten' ? 1 : 0;
      patch['editor.label'] = id === 'eaten' ? '吃上饭了' : id === 'pending' ? '还没吃饭' : '这顿没吃';
      if (id !== 'eaten') { patch['editor.meta.fullness'] = ''; patch['editor.meta.satisfaction'] = ''; }
    }
    this.setData(patch);
  },
  saveEditor() {
    if (this.data.sheet !== 'editor' || this.saving) return;
    const e = this.data.editor;
    let at = this.timeEdited ? new Date(`${e.date}T${e.time}:00`).getTime() : this.data.editingId ? e.at : Date.now();
    const input = { preset: e.preset, label: e.label, direction: e.direction, note: e.note, impact: e.impact || undefined,
      meta: e.meta, at, minutes: e.minutesText === '' ? undefined : Number(e.minutesText), points: undefined };
    if (this.data.editingId && !this.weightDirty) input.points = e.points;
    if (!this.data.editingId && !this.data.timerFinishing) return this.saveNew(input);
    this.saving = true;
    try {
      const before = energy.battery(this.state).value;
      const next = this.data.timerFinishing ? energy.finishTimer(this.state, { ...input, at: Date.now() }) : energy.editEvent(this.state, this.data.editingId, input);
      this.clearMotion();
      this.holdScene = this.data.timerFinishing && !this.data.reducedMotion;
      if (this.commit(next)) {
        const wasTimer = this.data.timerFinishing;
        this.setSheet('', { timerFinishing: false, selectedPreset: '', selectedLabel: '' });
        if (wasTimer) { const entry = next.events[next.events.length - 1]; this.setData({ lastAdded: entry.id, feedback: '这一段，留下了。' }); this.animateRecord(entry, before); }
        else { this.clearMotion(); message('已更新这一段'); }
      }
    } catch (err) { message(err.message); } finally { this.holdScene = false; this.saving = false; }
  },
  deleteEntry() {
    const id = this.data.editingId;
    wx.showModal({ title: '删除这一段？', content: '花园与电量会按剩下的记录重新整理。', confirmText: '删除', success: (r) => {
      if (r.confirm && this.commit(energy.removeEvent(this.state, id))) { this.clearMotion(); this.closeSheet(); }
    } });
  },
  openCalibration() { this.setSheet('calibration'); },
  chooseFeeling(e) {
    const feeling = energy.FEELINGS.find((f) => f.id === ds(e).id);
    if (!feeling) return;
    try { if (this.commit(energy.calibrate(this.state, feeling.value))) { this.clearMotion(); this.closeSheet(); message('以此刻的感受为准'); } }
    catch (err) { message(err.message); }
  },
  startTimer() { if (this.commit(energy.startTimer(this.state))) { this.closeSheet(); message('按自己的节奏来'); } },
  stopTimer() { this.newEditor('work'); this.setData({ timerFinishing: true }); },
  discardTimer() {
    wx.showModal({ title: '结束并不留记录？', content: '这一段计时将被丢弃。', success: (r) => {
      if (r.confirm && this.commit(energy.finishTimer(this.state, null))) this.closeSheet();
    } });
  },
  closeSheet() { this.setSheet('', { timerFinishing: false }); },
  noop() {},
  changeMonth(e) {
    this.month = new Date(this.month.getFullYear(), this.month.getMonth() + Number(ds(e).delta), 1);
    const today = new Date();
    const date = today.getMonth() === this.month.getMonth() && today.getFullYear() === this.month.getFullYear() ? energy.dayKey(today) : energy.dayKey(this.month);
    this.setData({ selectedDate: date, posterPage: 0 }); this.refresh();
  },
  selectDay(e) {
    const cell = this.data.cells.find((c) => c.key === ds(e).date);
    if (!cell || cell.outside || cell.future) return;
    this.setData({ selectedDate: cell.key, posterPage: 0 }); this.refresh();
  },
  openDay() { this.setSheet('day'); },
  openToday() { this.setData({ selectedDate: this.data.today, posterPage: 0 }); this.refresh(); this.openDay(); },
  shareDay() { this.switchView({ currentTarget: { dataset: { view: 'share' } } }); },
  changeShareDate(e) { this.setData({ selectedDate: e.detail.value, posterPage: 0 }); this.refresh(); },
  shareToday() { this.setData({ selectedDate: this.data.today, posterPage: 0 }); this.refresh(); },
  privacyChange(e) { this.setData({ showNames: e.detail.value, posterPage: 0 }); this.makePoster(); },
  changeFormat(e) { const f = ds(e).value; this.setData({ posterFormat: f, posterHeight: f === 'square' ? 600 : 1050, posterPage: 0 }); this.makePoster(); },
  changePosterPage(e) { this.setData({ posterPage: Math.max(0, Math.min(this.data.posterPages - 1, this.data.posterPage + Number(ds(e).delta))) }); this.makePoster(); },
  makePoster() {
    if (this.posterDrawing) { this.posterPending = true; this.setData({ busy: true, posterPath: '' }); return; }
    this.posterDrawing = true;
    const count = poster.pageCount(this.state, this.data.selectedDate, this.data.showNames, this.data.posterFormat);
    this.setData({ busy: true, posterError: false, posterPath: '', posterPages: count, posterPage: Math.min(this.data.posterPage, count - 1) });
    wx.nextTick(() => {
      if (this.unloaded) { this.posterDrawing = false; return; }
      poster.draw(this, this.state, this.data.selectedDate, this.data.showNames, (err, path) => {
        this.posterDrawing = false;
        if (this.unloaded) return;
        if (this.posterPending) { this.posterPending = false; this.makePoster(); return; }
        this.setData({ busy: false, posterError: !!err, posterPath: err ? '' : path });
        if (err) message('图片生成失败，可以重试');
      }, this.data.posterPage, this.data.posterFormat);
    });
  },
  previewPoster() { if (!this.data.busy && this.data.posterPath) wx.previewImage({ urls: [this.data.posterPath] }); },
  savePoster() {
    if (this.data.busy || !this.data.posterPath || this.albumSaving) return;
    this.albumSaving = true;
    wx.saveImageToPhotosAlbum({ filePath: this.data.posterPath, success: () => message('这一页已保存到相册'),
      complete: () => { this.albumSaving = false; }, fail: () => wx.showModal({ title: '还没有保存到相册', content: '可以检查相册权限，或打开大图后长按保存。', confirmText: '打开大图', success: (r) => { if (r.confirm) this.previewPoster(); } }) });
  },
  openSettings() { this.setSheet('settings'); },
  changeMotion(e) { if (this.commit({ ...this.state, settings: { ...this.state.settings, reducedMotion: e.detail.value } })) this.clearMotion(); },
  exportBackup() {
    wx.showModal({ title: '复制完整备份？', content: '包括记录名称、时间和私人备注。请只保存到你信任的地方。', confirmText: '复制备份', success: (r) => {
      if (!r.confirm) return;
      try { wx.setClipboardData({ data: storage.raw(), success: () => message('完整备份已复制'), fail: () => message('复制失败，请重试') }); }
      catch (e) { message('原始备份暂时无法读取'); }
    } });
  },
  restoreBackup() { this.setSheet('restore', { restoreText: '' }); },
  restoreInput(e) { this.setData({ restoreText: e.detail.value }); },
  confirmRestore() {
    const text = this.data.restoreText;
    try {
      if (text.length > 2 * 1024 * 1024) throw new Error('备份太大，请换一份文件');
      const state = energy.validate(JSON.parse(text));
      wx.showModal({ title: '恢复这份备份？', content: `将替换为 ${state.events.length} 条记录。当前数据会另存一份本机备份。`, success: (r) => {
        if (!r.confirm) return;
        try { this.state = storage.restore(text); this.setData({ stateError: '', sheet: '', lastAdded: '', feedback: '' }); this.clearMotion(); this.refresh(); message('已恢复记录'); }
        catch (e) { message(e.message || '恢复失败'); }
      } });
    } catch (e) { message(e.message || '备份格式不正确'); }
  },
  onShareAppMessage() { return { title: '日迹 · 这一天，都算数', path: '/pages/index/index' }; },
});
