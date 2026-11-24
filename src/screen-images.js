// Bitmap screen artwork (Farbound wallpapers, the iPad home screen). Images load
// once; drawing code asks for an image and gets null until it has decoded, then
// redraws from an onScreenImage callback.
const cache = new Map(), waiters = new Set();

export function screenImage(url) {
  let entry = cache.get(url);
  if (!entry) {
    const img = new Image();
    entry = { img, ready: false };
    img.onload = () => { entry.ready = true; for (const f of [...waiters]) f(url); };
    img.src = url; cache.set(url, entry);
  }
  return entry.ready ? entry.img : null;
}
export function onScreenImage(f) { waiters.add(f); return () => waiters.delete(f); }
// Other screen sources (HTML pages) announce that a redraw is due.
export function notifyScreenImage(id = 'html') { for (const f of [...waiters]) f(id); }

// Cover-fit `img` into W × H, keeping the point (fx, fy) of the image as close to
// the centre of the crop as the edges allow.
export function drawCover(ctx, img, W, H, fx = .5, fy = .5) {
  const iw = img.naturalWidth, ih = img.naturalHeight, scale = Math.max(W / iw, H / ih);
  const sw = W / scale, sh = H / scale;
  const sx = Math.min(iw - sw, Math.max(0, iw * fx - sw / 2)), sy = Math.min(ih - sh, Math.max(0, ih * fy - sh / 2));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
}
