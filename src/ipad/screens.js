// Default artwork for the iPad: an iPadOS-style home screen, drawn landscape
// at 2360∶1640. Generic widgets and icons only (no real app marks). Used by
// src/artwork.js for the "Presentation" preset when the iPad is on stage.

import { screenImage, drawCover } from '../screen-images.js';

// Realistic iPadOS home screen (generated image, screens/ipad-home.jpg). Until it
// has decoded, the procedural home screen below stands in (canvas.pending).
const HOME_IMAGE = 'screens/ipad-home.jpg', PORTRAIT_IMAGE = 'screens/ipad-home-portrait.jpg';
screenImage(HOME_IMAGE); screenImage(PORTRAIT_IMAGE);

// Portrait home screen (screens/ipad-home-portrait.jpg) for the upright views, so
// they show the full portrait layout instead of a crop of the landscape one.
// Returns null until the image has decoded.
export function ipadHomePortrait(W = 1312, H = 1888) {
  const img = screenImage(PORTRAIT_IMAGE);
  if (!img) return null;
  const c = document.createElement('canvas'); c.width = W; c.height = H; drawCover(c.getContext('2d'), img, W, H); return c;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

const ICONS = [
  ['Studio', ['#ff9f43', '#ff5e62'], 'ring'], ['Notes', ['#ffe27a', '#f7c531'], 'lines'], ['Weather', ['#4fa3ff', '#1d5fe0'], 'sun'],
  ['Files', ['#5ac8fa', '#1f8ef1'], 'folder'], ['Music', ['#ff6b8b', '#f2334f'], 'note'], ['Camera', ['#c9ccd3', '#8e9299'], 'lens'],
  ['Maps', ['#7ee08a', '#37b56b'], 'pin'], ['Clock', ['#3a3a3f', '#111114'], 'clock'], ['Books', ['#ffb35c', '#ff7a1a'], 'book'],
  ['Reminders', ['#ffffff', '#e9e9ee'], 'dots'], ['Podcasts', ['#c77dff', '#8a3ffc'], 'wave'], ['Settings', ['#9ea3ab', '#6c7078'], 'gear'],
];
const DOCK = [
  [['#62e27a', '#22b84b'], 'bubble'], [['#5ab0ff', '#1e6ff0'], 'compass'], [['#ff6b8b', '#f2334f'], 'note'], [['#5ab0ff', '#1a73e8'], 'mail'],
  [['#ffffff', '#ececf1'], 'cal'], [['#ffffff', '#f2f2f5'], 'petals'], [['#ffe27a', '#f7c531'], 'lines'], [['#4fa3ff', '#1d5fe0'], 'sun'],
];

function glyph(ctx, kind, x, y, s, light) {
  const c = s / 2, ink = light ? '#1b1b1f' : '#ffffff';
  ctx.save(); ctx.translate(x + c, y + c); ctx.fillStyle = ink; ctx.strokeStyle = ink; ctx.lineCap = 'round'; ctx.lineWidth = s * .075;
  const P = Math.PI;
  switch (kind) {
    case 'ring': ctx.lineWidth = s * .1; ctx.beginPath(); ctx.arc(0, 0, s * .24, 0, 2 * P); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, s * .08, 0, 2 * P); ctx.fill(); break;
    case 'lines': ctx.fillStyle = '#ffffff'; roundRect(ctx, -s * .5, -s * .5 + s * .3, s, s * .7, 0); ctx.fill();
      ctx.strokeStyle = '#d9d2bf'; ctx.lineWidth = s * .03; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-s * .36, -s * .05 + i * s * .12); ctx.lineTo(s * .36, -s * .05 + i * s * .12); ctx.stroke(); } break;
    case 'sun': ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.arc(-s * .08, -s * .06, s * .17, 0, 2 * P); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s * .06, s * .1, s * .14, 0, 2 * P); ctx.arc(s * .2, s * .12, s * .11, 0, 2 * P); ctx.arc(-s * .08, s * .14, s * .1, 0, 2 * P); ctx.fill(); break;
    case 'folder': ctx.fillStyle = '#ffffff'; roundRect(ctx, -s * .28, -s * .18, s * .56, s * .4, s * .05); ctx.fill(); roundRect(ctx, -s * .28, -s * .24, s * .22, s * .1, s * .04); ctx.fill(); break;
    case 'note': ctx.beginPath(); ctx.arc(-s * .1, s * .14, s * .09, 0, 2 * P); ctx.fill(); ctx.beginPath(); ctx.arc(s * .14, s * .08, s * .09, 0, 2 * P); ctx.fill();
      ctx.lineWidth = s * .06; ctx.beginPath(); ctx.moveTo(-s * .02, s * .14); ctx.lineTo(-s * .02, -s * .22); ctx.lineTo(s * .22, -s * .28); ctx.lineTo(s * .22, s * .08); ctx.stroke(); break;
    case 'lens': ctx.fillStyle = '#2a2b30'; roundRect(ctx, -s * .3, -s * .18, s * .6, s * .4, s * .07); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, s * .02, s * .13, 0, 2 * P); ctx.fill();
      ctx.fillStyle = '#2a2b30'; ctx.beginPath(); ctx.arc(0, s * .02, s * .08, 0, 2 * P); ctx.fill(); break;
    case 'pin': ctx.fillStyle = '#f9f3e3'; ctx.fillRect(-s * .5, s * .02, s, s * .08); ctx.fillStyle = '#ff4b3e'; ctx.beginPath(); ctx.arc(0, -s * .08, s * .13, P, 0); ctx.lineTo(0, s * .18); ctx.closePath(); ctx.fill(); break;
    case 'clock': ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, s * .32, 0, 2 * P); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = s * .045;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * .2); ctx.moveTo(0, 0); ctx.lineTo(s * .14, s * .06); ctx.stroke(); ctx.strokeStyle = '#ff9500'; ctx.lineWidth = s * .02; ctx.beginPath(); ctx.moveTo(0, s * .08); ctx.lineTo(-s * .05, -s * .26); ctx.stroke(); break;
    case 'book': ctx.beginPath(); ctx.moveTo(0, -s * .16); ctx.quadraticCurveTo(-s * .16, -s * .24, -s * .3, -s * .18); ctx.lineTo(-s * .3, s * .2); ctx.quadraticCurveTo(-s * .16, s * .14, 0, s * .22);
      ctx.quadraticCurveTo(s * .16, s * .14, s * .3, s * .2); ctx.lineTo(s * .3, -s * .18); ctx.quadraticCurveTo(s * .16, -s * .24, 0, -s * .16); ctx.fill(); break;
    case 'dots': for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ff3b30', '#007aff', '#ff9500'][i]; ctx.beginPath(); ctx.arc(-s * .2, -s * .18 + i * s * .18, s * .055, 0, 2 * P); ctx.fill();
      ctx.fillStyle = '#c7c7cc'; ctx.fillRect(-s * .08, -s * .19 + i * s * .18, s * .32, s * .025); } break;
    case 'wave': ctx.lineWidth = s * .06; for (const r of [.1, .2, .3]) { ctx.beginPath(); ctx.arc(0, 0, s * r, -P * .8, -P * .2); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, s * .02, s * .06, 0, 2 * P); ctx.fill(); break;
    case 'gear': ctx.lineWidth = s * .05; ctx.beginPath(); ctx.arc(0, 0, s * .2, 0, 2 * P); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i * P / 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * s * .23, Math.sin(a) * s * .23); ctx.lineTo(Math.cos(a) * s * .32, Math.sin(a) * s * .32); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, s * .07, 0, 2 * P); ctx.fill(); break;
    case 'bubble': ctx.beginPath(); ctx.ellipse(0, -s * .02, s * .3, s * .24, 0, 0, 2 * P); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s * .2, s * .12); ctx.lineTo(-s * .26, s * .28); ctx.lineTo(-s * .04, s * .18); ctx.fill(); break;
    case 'compass': ctx.lineWidth = s * .03; ctx.beginPath(); ctx.arc(0, 0, s * .32, 0, 2 * P); ctx.stroke(); ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.moveTo(s * .2, -s * .2); ctx.lineTo(s * .04, s * .04); ctx.lineTo(-s * .04, -s * .04); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-s * .2, s * .2); ctx.lineTo(s * .04, s * .04); ctx.lineTo(-s * .04, -s * .04); ctx.fill(); break;
    case 'mail': ctx.fillStyle = '#ffffff'; ctx.fillRect(-s * .3, -s * .2, s * .6, s * .4); ctx.strokeStyle = '#1a73e8'; ctx.lineWidth = s * .035; ctx.beginPath(); ctx.moveTo(-s * .3, -s * .2); ctx.lineTo(0, s * .04); ctx.lineTo(s * .3, -s * .2); ctx.stroke(); break;
    case 'cal': ctx.fillStyle = '#ff3b30'; ctx.font = '600 ' + s * .15 + 'px -apple-system, Helvetica, Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TUE', 0, -s * .17);
      ctx.fillStyle = '#111'; ctx.font = '300 ' + s * .44 + 'px -apple-system, Helvetica, Arial, sans-serif'; ctx.fillText('1', 0, s * .3); break;
    case 'petals': for (let i = 0; i < 8; i++) { ctx.fillStyle = ['#ffcc00', '#ff9500', '#ff3b30', '#ff2d78', '#af52de', '#5856d6', '#34aadc', '#4cd964'][i]; ctx.globalAlpha = .85;
      ctx.save(); ctx.rotate(i * P / 4); ctx.beginPath(); ctx.ellipse(0, -s * .17, s * .085, s * .16, 0, 0, 2 * P); ctx.fill(); ctx.restore(); } ctx.globalAlpha = 1; break;
  }
  ctx.restore();
}

function appIcon(ctx, x, y, s, colors, kind) {
  const g = ctx.createLinearGradient(x, y, x, y + s); g.addColorStop(0, colors[0]); g.addColorStop(1, colors[1]);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = s * .12; ctx.shadowOffsetY = s * .04;
  roundRect(ctx, x, y, s, s, s * .225); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  ctx.save(); roundRect(ctx, x, y, s, s, s * .225); ctx.clip();
  const light = colors[0] === '#ffffff' || colors[0] === '#ffe27a';
  glyph(ctx, kind, x, y, s, light); ctx.restore();
}

export function ipadHomeScreen(W = 1888, H = 1312) {
  const img = screenImage(HOME_IMAGE);
  if (img) { const c = document.createElement('canvas'); c.width = W; c.height = H; drawCover(c.getContext('2d'), img, W, H); return c; }
  const c = proceduralHome(W, H); c.pending = true; return c;
}

function proceduralHome(W, H) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d'), s = W / 1180;   // iPadOS points at this canvas size
  // Wallpaper: deep blue field with broad, soft ribbons of colour.
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, '#1b3fd8'); base.addColorStop(.5, '#3b7bff'); base.addColorStop(1, '#8fd3ff');
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.filter = 'blur(' + Math.round(26 * s) + 'px)';
  const blob = (x, y, rx, ry, rot, a, b) => {
    const g = ctx.createLinearGradient(x - rx, y, x + rx, y); g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
  };
  blob(W * .18, H * .95, W * .55, H * .32, -.25, '#ff3d9a', '#ff8a3d');
  blob(W * .78, H * .78, W * .5, H * .22, -.18, '#ffd23f', '#ff7a2f');
  blob(W * .42, H * .48, W * .42, H * .16, -.32, '#7b3dff', '#ff4fb4');
  blob(W * .9, H * .1, W * .32, H * .24, .3, '#59e0ff', '#a6f0ff');
  ctx.restore();
  // Gentle vignette for depth.
  const v = ctx.createRadialGradient(W * .5, H * .45, H * .2, W * .5, H * .5, W * .75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,10,40,.28)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

  const font = (w, px) => w + ' ' + px * s + 'px -apple-system, "SF Pro Text", Helvetica, Arial, sans-serif';
  // Status bar.
  ctx.fillStyle = '#ffffff'; ctx.font = font(600, 15); ctx.textBaseline = 'middle';
  ctx.fillText('9:41', 22 * s, 16 * s); ctx.font = font(500, 15); ctx.fillText('Tue Apr 1', 62 * s, 16 * s);
  ctx.textAlign = 'right'; ctx.font = font(600, 14); ctx.fillText('100%', W - 58 * s, 16 * s); ctx.textAlign = 'left';
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4 * s; roundRect(ctx, W - 50 * s, 9.5 * s, 25 * s, 13 * s, 4 * s); ctx.stroke();
  ctx.fillStyle = '#fff'; roundRect(ctx, W - 48 * s, 11.5 * s, 21 * s, 9 * s, 2.5 * s); ctx.fill(); ctx.fillRect(W - 23.5 * s, 14 * s, 1.8 * s, 4 * s);
  ctx.lineWidth = 2.2 * s; ctx.strokeStyle = '#fff'; ctx.lineCap = 'round';
  for (const r of [4, 8, 12]) { ctx.beginPath(); ctx.arc(W - 108 * s, 21 * s, r * s, -Math.PI * .75, -Math.PI * .25); ctx.stroke(); }

  // Widgets column (left), app grid (right), dock (bottom).
  const pad = 44 * s, wTop = 58 * s, ws = 156 * s, gap = 22 * s;
  const glassCard = (x, y, w, h, fill) => { ctx.save(); ctx.shadowColor = 'rgba(0,0,40,.25)'; ctx.shadowBlur = 24 * s; ctx.shadowOffsetY = 6 * s; roundRect(ctx, x, y, w, h, 22 * s); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); };
  // Weather widget.
  { const x = pad, y = wTop, w = ws * 2 + gap, h = ws; const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#2f7bf0'); g.addColorStop(1, '#6db1ff');
    glassCard(x, y, w, h, g); ctx.fillStyle = '#fff'; ctx.font = font(600, 16); ctx.fillText('Cupertino', x + 18 * s, y + 26 * s);
    ctx.font = font(300, 50); ctx.fillText('72°', x + 16 * s, y + 70 * s);
    ctx.font = font(500, 13); ctx.textAlign = 'right'; ctx.fillText('Mostly Sunny', x + w - 18 * s, y + 28 * s); ctx.fillText('H:78° L:61°', x + w - 18 * s, y + 46 * s); ctx.textAlign = 'center';
    for (let i = 0; i < 6; i++) { const cx = x + 30 * s + i * (w - 60 * s) / 5; ctx.font = font(500, 11); ctx.fillText((10 + i) % 12 + 1 + (i < 2 ? 'AM' : 'PM'), cx, y + 108 * s);
      ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.arc(cx, y + 126 * s, 6 * s, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(70 + i + '°', cx, y + 145 * s); }
    ctx.textAlign = 'left'; }
  // Calendar widget.
  { const x = pad, y = wTop + ws + gap, w = ws * 2 + gap, h = ws * 1.32; glassCard(x, y, w, h, '#ffffff');
    ctx.fillStyle = '#ff3b30'; ctx.font = font(700, 12); ctx.fillText('TUESDAY', x + 18 * s, y + 24 * s);
    ctx.fillStyle = '#111'; ctx.font = font(400, 30); ctx.fillText('1', x + 18 * s, y + 52 * s);
    const ev = [['Design review', '10:00 AM', '#ffd8a8', '#ff9500'], ['Lunch with Sam', '12:30 PM', '#d4f0d6', '#34c759'], ['Studio session', '3:00 PM', '#dfe3ff', '#5856d6']];
    ev.forEach(([t, time, bg, bar], i) => { const ey = y + 72 * s + i * 42 * s; roundRect(ctx, x + 16 * s, ey, w - 32 * s, 36 * s, 7 * s); ctx.fillStyle = bg; ctx.fill();
      ctx.fillStyle = bar; ctx.fillRect(x + 16 * s, ey, 4 * s, 36 * s); ctx.fillStyle = '#1c1c1e'; ctx.font = font(600, 12.5); ctx.fillText(t, x + 28 * s, ey + 13 * s);
      ctx.fillStyle = '#6b6b70'; ctx.font = font(500, 11); ctx.fillText(time, x + 28 * s, ey + 27 * s); }); }
  // App grid: 4 columns × 3 rows to the right of the widgets.
  const icon = 74 * s, gx0 = pad + ws * 2 + gap + 70 * s, gw = W - gx0 - 50 * s, colStep = (gw - icon) / 3, rowStep = 136 * s;
  ICONS.forEach(([name, colors, kind], i) => {
    const col = i % 4, row = Math.floor(i / 4), x = gx0 + col * colStep, y = wTop + 8 * s + row * rowStep;
    appIcon(ctx, x, y, icon, colors, kind);
    ctx.fillStyle = '#ffffff'; ctx.font = font(500, 12.5); ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,.3)'; ctx.shadowBlur = 4 * s;
    ctx.fillText(name, x + icon / 2, y + icon + 16 * s); ctx.shadowBlur = 0; ctx.textAlign = 'left';
  });
  // Page dots.
  for (let i = 0; i < 2; i++) { ctx.fillStyle = i ? 'rgba(255,255,255,.45)' : '#fff'; ctx.beginPath(); ctx.arc(W / 2 - 6 * s + i * 12 * s, H - 118 * s, 3.4 * s, 0, 7); ctx.fill(); }
  // Dock.
  { const n = DOCK.length, di = 62 * s, dg = 18 * s, dw = n * di + (n - 1) * dg + 2 * dg + 2 * di + 22 * s, dh = 86 * s, dx = (W - dw) / 2, dy = H - 98 * s;
    ctx.save(); roundRect(ctx, dx, dy, dw, dh, 30 * s); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1 * s; ctx.stroke(); ctx.restore();
    let x = dx + dg; const y = dy + (dh - di) / 2;
    DOCK.forEach(([colors, kind]) => { appIcon(ctx, x, y, di, colors, kind); x += di + dg; });
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x - dg / 2 + 1 * s, y + 6 * s, 1.5 * s, di - 12 * s); x += 11 * s;
    appIcon(ctx, x, y, di, ICONS[0][1], 'ring'); x += di + dg; appIcon(ctx, x, y, di, ICONS[10][1], 'wave'); }
  return c;
}
