const energy = require('./energy');
const TEMPLATES = ['peony', 'iris', 'tulip', 'window'];
const ASSETS = TEMPLATES.reduce((all, template) => all.concat(
  [0,1,2,3].reduce((scenes, stage) => scenes.concat(`${template}-${stage}.jpg`, `${template}-${stage}-didi.jpg`), [])
), []);
const ROTATION_START = Date.UTC(2026, 8, 19) / 86400000;
function templateForDate(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  if (!match) return 'window';
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const at = new Date(Date.UTC(year, month - 1, day));
  if (at.getUTCFullYear() !== year || at.getUTCMonth() !== month - 1 || at.getUTCDate() !== day) return 'window';
  const offset = at.getTime() / 86400000 - ROTATION_START;
  // Keep earlier diaries unchanged. Never reorder this date-to-template mapping.
  return offset < 0 ? 'window' : TEMPLATES[offset % TEMPLATES.length];
}
function kind(event) {
  if (event.preset === 'cat') return 'flower-red';
  if (event.direction < 0) return event.preset === 'work' ? 'leaf-stem' : 'flower-blue';
  if (event.direction === 0 || event.preset === 'meal') return 'flower-yellow';
  return 'flower-red';
}
function forDay(state, date) {
  const events = energy.daily(state, date).events;
  const count = events.length, cat = events.some((e) => e.preset === 'cat');
  // Authored arrangements preserve a shared root, foreground and window depth.
  const stage = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
  const template = templateForDate(date);
  return { stage, cat, count, template, asset: `${template}-${stage}${cat ? '-didi' : ''}.jpg` };
}
function marker(events) {
  if (!events.length) return '';
  return events.some((e) => e.preset === 'cat') ? 'cat' : kind(events[events.length - 1]);
}
module.exports = { ASSETS, TEMPLATES, templateForDate, forDay, marker };
