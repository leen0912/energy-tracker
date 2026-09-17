function layout(width, height, keyboard = 0, safeBottom = 0) {
  const w = Math.max(280, Number(width) || 375);
  const h = Math.max(240, Number(height) || 700);
  const inset = keyboard > 0 ? 12 : Math.max(12, safeBottom);
  const available = Math.max(160, h - Math.max(0, keyboard));
  const sheetHeight = Math.min(Math.round(h * .9), available - 8);
  return {
    sceneSize: Math.min(w, 500), overlayHeight: available, sheetHeight,
    sheetBottom: inset, sheetScrollHeight: Math.max(60, sheetHeight - 76 - inset),
  };
}
module.exports = { layout };
