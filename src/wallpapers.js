// Presentation wallpapers per device. The iPhones share a light silver
// wallpaper (`ink` darkens the status bar and wordmark to suit); the others use
// a Farbound space wallpaper
// from farbound.fyi/wallpapers (the plain versions; the FARBOUND wordmark and
// the status bar are drawn as vectors by screen-overlay.js). `fy` keeps that
// part of the picture in view when a display crops it.
import { screenImage, drawCover } from './screen-images.js';

export const presentationWallpapers = {
  pro: { name: 'Silver ribbons', file: 'silver-ribbons-iphone.jpg', fy: .5, ink: '#111113' },
  i17: { name: 'Silver ribbons', file: 'silver-ribbons-iphone.jpg', fy: .5, ink: '#111113' },
  air: { name: 'Silver ribbons', file: 'silver-ribbons-iphone.jpg', fy: .5, ink: '#111113' },
  pixel: { name: 'Dunes', file: 'pixel-dunes-obsidian.jpg', fy: .5, finishes: { Obsidian: 'pixel-dunes-obsidian.jpg', Canyon: 'pixel-dunes-canyon.jpg', Olive: 'pixel-dunes-olive.jpg', Fog: 'pixel-dunes-fog.jpg' } },
  duo: { name: 'Silver ribbons', file: 'silver-ribbons-iphone.jpg', fy: .5, ink: '#111113' },
  'duo-cover': { name: 'Silver ribbons', file: 'silver-ribbons-iphone.jpg', fy: .5, ink: '#111113' },
  ipadmini: { name: 'Graphite loops', file: 'graphite-loops-macbook.jpg', fy: .5, finishes: { Starlight: 'silver-loops-macbook.jpg' }, finishInk: { Starlight: '#111113' } },
  'ipadmini-portrait': { name: 'Graphite loops', file: 'graphite-loops-macbook.jpg', fy: .5, finishes: { Starlight: 'silver-loops-macbook.jpg' }, finishInk: { Starlight: '#111113' } },
  // The iPad shares the MacBook Pro's loops (lighter loops for the pale finishes).
  ipad: { name: 'Graphite loops', file: 'graphite-loops-macbook.jpg', fy: .5, finishes: { Silver: 'silver-loops-macbook.jpg', Starlight: 'silver-loops-macbook.jpg' }, finishInk: { Silver: '#111113', Starlight: '#111113' } },
  'ipad-portrait': { name: 'Graphite loops', file: 'graphite-loops-macbook.jpg', fy: .5, finishes: { Silver: 'silver-loops-macbook.jpg', Starlight: 'silver-loops-macbook.jpg' }, finishInk: { Silver: '#111113', Starlight: '#111113' } },
  // Mac displays: macOS desktops made for the studio (menu bar and Dock are part of the picture).
  mbp: { name: 'Graphite loops', file: 'graphite-loops-macbook.jpg', fy: .5, finishes: { Silver: 'silver-loops-macbook.jpg' } },
  sdx: { name: 'Spectrum folds', file: 'spectrum-folds-xdr.jpg', fy: .5 },
  imac: { name: 'Ribbons', file: 'lilac-ribbons-imac.jpg', fy: .5, finishes: { Blue: 'ribbons-imac-blue.jpg', Purple: 'lilac-ribbons-imac.jpg', Pink: 'ribbons-imac-pink.jpg', Orange: 'ribbons-imac-orange.jpg', Yellow: 'ribbons-imac-yellow.jpg', Green: 'ribbons-imac-green.jpg', Silver: 'ribbons-imac-silver.jpg' } },
};
const url = (w) => w.path || 'screens/wallpapers/' + w.file;
// A wallpaper can come in one file per device finish (`finishes: {name: file}`).
const pick = (w, finish) => (finish && w.finishes?.[finish] ? { ...w, file: w.finishes[finish], path: null } : w);
// Status-bar colour for a wallpaper (and finish).
export const wallpaperInk = (key, finish) => presentationWallpapers[key]?.finishInk?.[finish] || presentationWallpapers[key]?.ink || '#fff';
export function preloadWallpapers() {
  for (const w of Object.values(presentationWallpapers)) { screenImage(url(w)); for (const f of Object.keys(w.finishes || {})) screenImage(url(pick(w, f))); }
}

// A canvas of the device's wallpaper at the target aspect, drawn with a long
// edge of at least 2600 px. `canvas.pending` is set while the image loads.
// `finish` (a finish name) picks that finish's version when there is one.
export function wallpaperCanvas(key, W, H, finish = null) {
  const w = presentationWallpapers[key] && pick(presentationWallpapers[key], finish), k = Math.max(1, 2600 / Math.max(W, H));
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#05060b'; ctx.fillRect(0, 0, c.width, c.height);
  const img = w && screenImage(url(w));
  if (img) drawCover(ctx, img, c.width, c.height, .5, w.fy); else c.pending = true;
  return c;
}
