const energy = require('./energy');
const ASSETS = [0,1,2,3].reduce((all,stage) => all.concat(`window-${stage}.jpg`,`window-${stage}-didi.jpg`),[]);
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
  return { stage, cat, count, asset: `window-${stage}${cat ? '-didi' : ''}.jpg` };
}
function marker(events) {
  if (!events.length) return '';
  return events.some((e) => e.preset === 'cat') ? 'cat' : kind(events[events.length - 1]);
}
module.exports = { ASSETS, forDay, marker };
