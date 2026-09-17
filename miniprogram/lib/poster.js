const energy = require('./energy');
const garden = require('./garden');
const WIDTH = 600;
function wrap(text, width, size = 23) {
  const lines = []; let line = '', used = 0;
  for (const ch of Array.from(text)) {
    const advance = /[\x00-\x7f]/.test(ch) ? size * .78 : size;
    if (line && used + advance > width) { lines.push(line); line = ''; used = 0; }
    line += ch; used += advance;
  }
  if (line) lines.push(line);
  return lines;
}
function layout(state, date, showNames, format = 'portrait') {
  const square = format === 'square', events = energy.daily(state, date).events;
  const pages = [[]], capacity = square ? 326 : 200;
  if (!showNames) return pages;
  let used = 0;
  events.forEach((event) => {
    const lines = wrap(event.label, square ? 232 : 504);
    const height = lines.length * 30 + 14;
    if (used && used + height > capacity) { pages.push([]); used = 0; }
    pages[pages.length - 1].push({ id: event.id, lines, height }); used += height;
  });
  return pages;
}
function pageCount(state, date, names, format) { return layout(state, date, names, format).length; }
function draw(page, state, date, showNames, callback, pageIndex = 0, format = 'portrait') {
  let called = false;
  const done = (err, path) => { if (!called) { called = true; clearTimeout(timeout); callback(err, path); } };
  const timeout = setTimeout(() => done(new Error('Canvas export timed out')), 12000);
  try {
    const square = format === 'square', height = square ? 600 : 1050;
    const ctx = wx.createCanvasContext('poster', page);
    const text = (value, x, y, size = 23, color = '#202526') => { ctx.setFontSize(size); ctx.font = `${size}px ${size >= 25 ? 'serif' : 'sans-serif'}`; ctx.setFillStyle(color); ctx.fillText(value, x, y); };
    const rect = (x, y, w, h, color) => { ctx.setFillStyle(color); ctx.fillRect(x, y, w, h); };
    rect(0, 0, WIDTH, height, '#ffffff');
    const scene = garden.forDay(state, date);
    if (square) ctx.drawImage(`/assets/${scene.asset}`, 286, 152, 290, 290);
    else ctx.drawImage(`/assets/${scene.asset}`, 0, 140, 600, 600);
    text('生活的回响', 34, 44, 18);
    text(date.replace(/-/g, '.'), 420, 44, 17, '#63706e');
    text('这一天，都算数。', 34, square ? 105 : 135, square ? 36 : 48);
    if (!square) text('忙碌有迹，恢复也有。', 36, 185, 20, '#63706e');
    const pages = layout(state, date, showNames, format), index = Math.min(pageIndex, pages.length - 1);
    let y = square ? 160 : 768;
    if (!showNames || !scene.count) {
      text(!scene.count ? '给今天留一点空白。' : `这一天，留下 ${scene.count} 个片刻。`, 34, y, square ? 17 : 23, '#63706e');
    } else {
      pages[index].forEach((row) => {
        row.lines.forEach((line) => { text(line, 34, y, 23); y += 30; });
        y += 14;
      });
    }
    rect(34, height - 76, 532, 1, '#d8dfdb');
    text('日迹', 34, height - 35, 25);
    text('生活，在此生长。', 315, height - 36, 18, '#63706e');
    if (pages.length > 1) text(`${index + 1} / ${pages.length}`, 514, height - 36, 15, '#63706e');
    ctx.draw(false, () => wx.canvasToTempFilePath({ canvasId: 'poster', x: 0, y: 0, width: WIDTH, height,
      destWidth: WIDTH * 2, destHeight: height * 2, fileType: 'png', success: (r) => done(null, r.tempFilePath), fail: (e) => done(e) }, page));
  } catch (err) { done(err); }
}
module.exports = { wrap, layout, pageCount, draw };
