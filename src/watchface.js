// Presentation face for the Apple Watch: a clean analog dial on black at
// 10:09 with the date, in the spirit of Apple's product shots (drawn here, not
// copied). Returns a W × H canvas.
export function watchFaceCanvas(W, H) {
  const k = Math.max(1, 1600 / Math.max(W, H)), c = document.createElement('canvas');
  c.width = Math.round(W * k); c.height = Math.round(H * k);
  const ctx = c.getContext('2d'), w = c.width, h = c.height, s = w / 832, cx = w / 2, cy = h / 2;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
  ctx.lineCap = 'round'; ctx.strokeStyle = '#fff';
  // Hour markers on a rounded-rectangle track that follows the display.
  const rx = w * .41, ry = h * .41;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, dx = Math.sin(a), dy = -Math.cos(a);
    // Scale the ray to the edge of a superellipse so markers hug the corners.
    const n = 5, t = 1 / Math.pow(Math.pow(Math.abs(dx / rx), n) + Math.pow(Math.abs(dy / ry), n), 1 / n);
    const len = (i % 3 ? 50 : 66) * s;
    ctx.lineWidth = (i % 3 ? 11 : 13) * s;
    ctx.beginPath(); ctx.moveTo(cx + dx * t, cy + dy * t); ctx.lineTo(cx + dx * (t - len), cy + dy * (t - len)); ctx.stroke();
  }
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 ${64 * s}px -apple-system, "SF Pro Display", system-ui, sans-serif`;
  ctx.fillText('WED 1', cx, cy - 190 * s);
  // Hands: a thin stem, then an outlined capsule (hour and minute), at 10:09.
  function hand(deg, length, width) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(deg * Math.PI / 180);
    const stem = 46 * s;
    ctx.lineWidth = 9 * s; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -stem); ctx.stroke();
    const r = width / 2, top = -length, bottom = -stem;
    ctx.beginPath(); ctx.moveTo(-r, bottom - r); ctx.lineTo(-r, top + r); ctx.arc(0, top + r, r, Math.PI, 0); ctx.lineTo(r, bottom - r); ctx.arc(0, bottom - r, r, 0, Math.PI);
    ctx.fillStyle = '#000'; ctx.fill(); ctx.lineWidth = 7 * s; ctx.stroke();
    ctx.restore();
  }
  hand(304.5, 210 * s, 30 * s);
  hand(54, 330 * s, 30 * s);
  // Seconds hand and centre.
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(180 * Math.PI / 180);
  ctx.strokeStyle = '#ff9f0a'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(0, 60 * s); ctx.lineTo(0, -360 * s); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 15 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9f0a'; ctx.beginPath(); ctx.arc(cx, cy, 8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, 3.5 * s, 0, Math.PI * 2); ctx.fill();
  return c;
}
