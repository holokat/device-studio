// Presentation wallpapers: a different Farbound space wallpaper per device,
// from farbound.fyi/wallpapers (the plain versions; the FARBOUND wordmark and
// the status bar are drawn as vectors by screen-overlay.js). `fy` keeps that
// part of the picture in view when a display crops it.
import { screenImage, drawCover } from './screen-images.js';

export const presentationWallpapers = {
  pro: { name: 'Black hole', file: 'black-hole-iphone-pro.jpg', fy: .5 },
  i17: { name: "Jupiter's storm", file: 'jupiters-storm-iphone-pro.jpg', fy: .5 },
  air: { name: 'Aurora ice world', file: 'aurora-ice-world-iphone-pro-max.jpg', fy: .5 },
  pixel: { name: 'Terracotta Jupiter', file: 'terracotta-jupiter-iphone-pro-max.jpg', fy: .5 },
  duo: { name: 'Ringed planet over the canyon', file: 'ringed-planet-over-the-canyon-iphone-duo-inner.jpg', fy: .5 },
  'duo-cover': { name: 'Ringed planet over the canyon', file: 'ringed-planet-over-the-canyon-iphone-duo-cover.jpg', fy: .5 },
  ipad: { name: 'Ringed giant over the lake', file: 'ringed-giant-lake-ipad.jpg', fy: .5 },
  'ipad-portrait': { name: 'Ringed giant over the lake', file: 'ringed-giant-lake-ipad.jpg', fy: .5 },
  // Mac displays: macOS desktops made for the studio (menu bar and Dock are part of the picture).
  mbp: { name: 'macOS desktop', path: 'screens/macos-desktop.jpg', fy: .5 },
  sdx: { name: 'macOS desktop', path: 'screens/macos-desktop-wide.jpg', fy: .5 },
  imac: { name: 'macOS desktop', path: 'screens/macos-desktop-wide.jpg', fy: .5 },
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
