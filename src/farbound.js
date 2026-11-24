// Farbound iOS wallpapers as lock screens: the wallpaper, cover-cropped to the
// display, with the date and 9:41 clock on top. `fy` is the part of the portrait
// image to keep in view when a landscape display crops it.
import { screenImage, drawCover } from './screen-images.js';

export const farbound = [
  { id: 'black-hole', name: 'Black hole', fy: .6 },
  { id: 'climate', name: 'Earth climate', fy: .62 },
  { id: 'deep-time', name: 'Deep time', fy: .72 },
  { id: 'galaxy-flight', name: 'Galaxy flight', fy: .66 },
  { id: 'gravity', name: 'Gravity', fy: .56 },
  { id: 'interaction', name: 'Night Earth', fy: .74 },
  { id: 'mars', name: 'Mars', fy: .72 },
  { id: 'real-data', name: 'Orbital data', fy: .58 },
  { id: 'sounds', name: 'Sounds', fy: .48 },
  { id: 'stars', name: 'Stars', fy: .7 },
];
const byId = Object.fromEntries(farbound.map(w => [w.id, w]));
export const farboundId = (value) => typeof value === 'string' && value.startsWith('fb-') && byId[value.slice(3)] ? value.slice(3) : null;
export const farboundName = (id) => byId[id]?.name;
export const farboundURL = (id) => 'screens/farbound/' + id + '.jpg';
// Start every decode at load so switching wallpapers is instant.
export function preloadFarbound() { for (const w of farbound) screenImage(farboundURL(w.id)); }

const FONT = '-apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';

// Returns a canvas; `canvas.pending` is true while the image is still loading.
export function farboundScreen(id, W, H) {
  const w = byId[id], c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d'), img = screenImage(farboundURL(id));
  ctx.fillStyle = '#020306'; ctx.fillRect(0, 0, W, H);
  if (img) drawCover(ctx, img, W, H, .5, W > H ? w.fy : .5); else c.pending = true;
  // Light top scrim so the clock reads on bright wallpapers (Mars, Earth).
  const scrim = ctx.createLinearGradient(0, 0, 0, H * .42);
  scrim.addColorStop(0, 'rgba(0,0,0,.28)'); scrim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, H * .42);
  // Landscape (Duo inner, iPad): clock over the left half, clear of the crease.
  const landscape = W > H, u = landscape ? H * .8 / 1000 : W / 1000;
  const cx = landscape ? W * .25 : W / 2, top = landscape ? H * .1 : H * .085;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 24 * u; ctx.shadowOffsetY = 3 * u;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = '600 ' + 44 * u + 'px ' + FONT; ctx.fillText('Wednesday 1 April', cx, top + 44 * u);
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.font = '700 ' + 255 * u + 'px ' + FONT; ctx.fillText('9:41', cx, top + 44 * u + 250 * u);
  ctx.shadowColor = 'transparent';
  // Home indicator.
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  const bw = (landscape ? 260 : 300) * u, bh = 11 * u;
  ctx.beginPath(); ctx.roundRect((W - bw) / 2, H - 30 * u - bh, bw, bh, bh / 2); ctx.fill();
  return c;
}
