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
  pixel: { name: 'Terracotta Jupiter', file: 'terracotta-jupiter-iphone-pro-max.jpg', fy: .5 },
  duo: { name: 'Silver ribbons', file: 'silver-ribbons-iphone.jpg', fy: .5, ink: '#111113' },
  'duo-cover': { name: 'Silver ribbons', file: 'silver-ribbons-iphone.jpg', fy: .5, ink: '#111113' },
  ipad: { name: 'Ringed giant over the lake', file: 'ringed-giant-lake-ipad.jpg', fy: .5 },
  'ipad-portrait': { name: 'Ringed giant over the lake', file: 'ringed-giant-lake-ipad.jpg', fy: .5 },
  // Mac displays: macOS desktops made for the studio (menu bar and Dock are part of the picture).
  mbp: { name: 'Graphite loops', file: 'graphite-loops-macbook.jpg', fy: .5 },
  sdx: { name: 'Spectrum folds', file: 'spectrum-folds-xdr.jpg', fy: .5 },
  imac: { name: 'Lilac ribbons', file: 'lilac-ribbons-imac.jpg', fy: .5 },
};
const url = (w) => w.path || 'screens/wallpapers/' + w.file;
export function preloadWallpapers() { for (const w of Object.values(presentationWallpapers)) screenImage(url(w)); }

// A canvas of the device's wallpaper at the target aspect, drawn with a long
// edge of at least 2600 px. `canvas.pending` is set while the image loads.
export function wallpaperCanvas(key, W, H) {
  const w = presentationWallpapers[key], k = Math.max(1, 2600 / Math.max(W, H));
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(H * k);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#05060b'; ctx.fillRect(0, 0, c.width, c.height);
  const img = w && screenImage(url(w));
  if (img) drawCover(ctx, img, c.width, c.height, .5, w.fy); else c.pending = true;
  return c;
}
