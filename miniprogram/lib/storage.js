const energy = require("./energy");
const KEY = "daytrace.energy.wx.v1";
let fault = false;
function read() {
  try {
    const raw = wx.getStorageSync(KEY);
    const state = raw ? energy.validate(raw) : energy.empty();
    fault = false;
    return { state, error: null };
  } catch (e) {
    fault = true;
    return {
      state: energy.empty(),
      error: "本机记录暂时无法读取，请先备份原始数据。",
    };
  }
}
function save(state) {
  if (fault) throw new Error("请先导出原始备份，再恢复有效的数据");
  const clean = energy.validate(state);
  wx.setStorageSync(KEY, clean);
  return clean;
}
function raw() {
  return JSON.stringify(wx.getStorageSync(KEY) || energy.empty());
}
function restore(text) {
  const state = energy.validate(JSON.parse(text));
  const original = wx.getStorageSync(KEY);
  if (original) wx.setStorageSync(KEY + ".before-restore", original);
  wx.setStorageSync(KEY, state);
  fault = false;
  return state;
}
module.exports = { read, save, raw, restore };
