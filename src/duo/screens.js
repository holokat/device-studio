import * as THREE from 'three';

// Lock-screen artwork for the 5.4" outer display (1398 × 2034 px panel, drawn
// at full resolution so macro moves stay crisp): a light, airy mesh gradient
// of pale sky, lilac, peach and mint with a soft light bloom, fine grain and
// glass lock-screen controls. Static: uploads target the inner display.
export function outerLockScreen() {
  const W = 1398, H = 2034, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, W * .35, H);
  base.addColorStop(0, '#c9dcff'); base.addColorStop(.45, '#eef0ff'); base.addColorStop(1, '#fff3ea');
  ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
  // Soft colour fields, blended like a mesh gradient.
  const blob = (x, y, r, color, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(.55, `rgba(${color},${a * .45})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  blob(W * .12, H * .08, W * .95, '138,170,255', .55);   // periwinkle sky, top left
  blob(W * .95, H * .22, W * .75, '205,178,255', .5);    // lilac, top right
  blob(W * .2, H * .62, W * .8, '170,226,236', .45);     // aqua mist, middle left
  blob(W * .9, H * .78, W * .85, '255,196,170', .55);    // peach, lower right
  blob(W * .35, H * 1.02, W * .7, '255,226,190', .6);    // warm sand, bottom
  blob(W * .62, H * .45, W * .45, '255,255,255', .55);   // light bloom
  // Diagonal light sheen.
  ctx.save(); ctx.globalCompositeOperation = 'soft-light';
  const sheen = ctx.createLinearGradient(0, H * .2, W, H * .55);
  sheen.addColorStop(0, 'rgba(255,255,255,0)'); sheen.addColorStop(.5, 'rgba(255,255,255,.55)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen; ctx.fillRect(0, 0, W, H); ctx.restore();
  // Fine grain so the gradient does not band.
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 5; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
  // Date and time: white with a soft periwinkle shadow for legibility.
  const cx = W * .45;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(70,90,170,.28)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.font = '600 58px -apple-system, "SF Pro Display", Helvetica, Arial, sans-serif'; ctx.fillText('Wednesday 1 April', cx, 300);
  ctx.font = '600 390px -apple-system, "SF Pro Display", Helvetica, Arial, sans-serif'; ctx.fillText('9:41', cx, 670);
  ctx.shadowColor = 'transparent';
  // Glass flashlight and camera buttons, home indicator.
  const glass = (x, y, draw) => {
    ctx.beginPath(); ctx.arc(x, y, 74, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.42)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.strokeStyle = 'rgba(40,48,80,.78)'; ctx.fillStyle = 'rgba(40,48,80,.78)'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; draw(); ctx.restore();
  };
  glass(170, H - 230, () => { ctx.beginPath(); ctx.moveTo(-16, -34); ctx.lineTo(16, -34); ctx.lineTo(10, -8); ctx.lineTo(10, 34); ctx.lineTo(-10, 34); ctx.lineTo(-10, -8); ctx.closePath(); ctx.stroke(); });
  glass(W - 170, H - 230, () => { ctx.beginPath(); ctx.roundRect(-36, -22, 72, 50, 10); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 3, 13, 0, Math.PI * 2); ctx.stroke(); ctx.fillRect(-14, -31, 28, 9); });
  ctx.fillStyle = 'rgba(40,48,80,.55)'; ctx.beginPath(); ctx.roundRect(W / 2 - 150, H - 50, 300, 12, 6); ctx.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// StandBy-style clock for the outer display in the Standing (tent) pose, where
// the hinge is on top and the panel reads landscape. Drawn on the portrait
// panel canvas, turned a quarter.
export function outerStandBy() {
  const W = 699, H = 1017, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 2);
  const LW = H, LH = W;   // landscape frame, centred
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, LW * .6);
  glow.addColorStop(0, 'rgba(255,120,70,.10)'); glow.addColorStop(1, 'rgba(255,120,70,0)');
  ctx.fillStyle = glow; ctx.fillRect(-LW / 2, -LH / 2, LW, LH);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ff8a5c'; ctx.font = '600 300px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText('9:41', 0, 95);
  ctx.fillStyle = 'rgba(255,190,160,.85)'; ctx.font = '500 34px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillText('Wednesday 1 April', 0, -170);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}
