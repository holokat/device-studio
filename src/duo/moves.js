// iPhone Duo cinematic moves. Same schema as the moves in src/cinematic.js
// (id, name, note, dur, hold/loop, at/pts, view + dist, tracks of
// [time, value, ease] keys) plus Duo-only fields and channels:
//
//   device: 'duo'          only offered while the Duo is on stage
//   cat:    'Duo'          library category
//   poses:  [mode, ...]    device poses the move travels through (default ['book']):
//             book      hinge vertical; open = the landscape inner display
//             portrait  hinge horizontal, camera half on top
//             sym       hinge vertical, both halves turn equally (V toward camera)
//             seated    display half flat on a table, camera half raised (L shape)
//             standing  inverted V on its edges, outer display toward the camera
//   tracks.fold   0 closed … 1 flat
//   tracks.pose   fractional index into `poses` (blends the orientation)
//   tracks.blurL / blurR   defocus of the inner display's left/right half, as
//                          seen open (left = display half). ~0.06 is heavy.
//                          Blur also darkens toward that half's outer edge.
//   tracks.dimL / dimR     inner display halves fade to black (1 = off)
//   tracks.outer           outer display brightness (1 = on)
//
// Every view looks from the root's -Z side, where each pose turns a screen,
// so all moves end on a display. Views carry no part normals (at 'center' /
// 'hingeEnd'), so the director never mirrors them.

export const duoMoves = [
  // ── Pose transitions (apple.com "Foldable design" poses) ────────────
  { id: 'duo-closed-landscape', device: 'duo', cat: 'Duo', name: 'Closed → Landscape', note: 'Opens like a book to the wide inner display', dur: 4.5, hold: true,
    poses: ['book'], at: 'center', view: [0.14, 0.08, -1], dist: 38,
    tracks: { fold: [[0, 0], [0.12, 0], [0.86, 1, 'quintInOut'], [1, 1]], spin: [[0, 0.05], [1, 0, 'sine']], dolly: [[0, 0.86], [1, 1.04, 'sine']], glint: [[0, -0.5], [1, 0.4, 'sine']] } },
  { id: 'duo-closed-portrait', device: 'duo', cat: 'Duo', name: 'Closed → Portrait', note: 'Held sideways, the cover lifts open upward', dur: 4.5, hold: true,
    poses: ['portrait'], at: 'center', view: [0.1, 0.12, -1], dist: 46,
    tracks: { fold: [[0, 0], [0.12, 0], [0.86, 1, 'quintInOut'], [1, 1]], rise: [[0, 0.06], [1, 0, 'sine']], dolly: [[0, 0.82], [1, 1, 'sine']], glint: [[0, 0.5], [1, -0.3, 'sine']] } },
  { id: 'duo-landscape-portrait', device: 'duo', cat: 'Duo', name: 'Landscape → Portrait', note: 'Open display turns a quarter to upright', dur: 3.5, hold: true,
    poses: ['book', 'portrait'], at: 'center', view: [0.08, 0.06, -1], dist: 46,
    tracks: { fold: [[0, 1], [1, 1]], pose: [[0, 0], [0.15, 0], [0.85, 1, 'quintInOut'], [1, 1]], dolly: [[0, 1], [0.5, 1.06, 'sine'], [1, 1, 'sine']], glint: [[0, -0.3], [1, 0.3, 'sine']] } },
  { id: 'duo-portrait-closed', device: 'duo', cat: 'Duo', name: 'Portrait → Closed', note: 'Turns back upright and folds to the cover screen', dur: 4.5, hold: true,
    poses: ['portrait', 'book'], at: 'center', view: [0.1, 0.06, -1], dist: 46,
    tracks: { fold: [[0, 1], [0.3, 1], [0.92, 0, 'quintInOut'], [1, 0]], pose: [[0, 0], [0.42, 1, 'quintInOut'], [1, 1]], dolly: [[0, 1.02], [1, 0.9, 'sine']] } },
  { id: 'duo-fold-closed', device: 'duo', cat: 'Duo', name: 'Fold closed', note: 'The display half swings shut onto the cover', dur: 3.5, hold: true,
    poses: ['book'], at: 'center', view: [0.16, 0.1, -1], dist: 38,
    tracks: { fold: [[0, 1], [0.1, 1], [0.9, 0, 'quintInOut'], [1, 0]], spin: [[0, -0.03], [1, 0.02, 'sine']], dolly: [[0, 1.04], [1, 0.88, 'sine']] } },
  { id: 'duo-seated', device: 'duo', cat: 'Duo', name: 'Seated', note: 'Lies down and props its top half up', dur: 5, hold: true,
    poses: ['book', 'seated'], at: 'center', view: [0.12, 0.42, -1], dist: 40,
    tracks: { pose: [[0, 0], [0.48, 1, 'quintInOut'], [1, 1]], fold: [[0, 1], [0.38, 1], [0.94, 0.58, 'quintInOut'], [1, 0.58]], orbit: [[0, -0.03], [1, 0.02, 'sine']], dolly: [[0, 1.05], [1, 0.92, 'sine']] } },
  { id: 'duo-standing', device: 'duo', cat: 'Duo', name: 'Standing tent', note: 'Stands on its edges and opens into a tent', dur: 4.5, hold: true,
    poses: ['standing'], at: 'center', view: [-0.55, 0.22, -1], dist: 36,
    tracks: { fold: [[0, 0], [0.15, 0], [0.9, 0.33, 'quintInOut'], [1, 0.33]], orbit: [[0, 0.05], [1, -0.02, 'sine']], dolly: [[0, 0.92], [1, 1.04, 'sine']], glint: [[0, -0.6], [1, 0.4, 'sine']] } },
  { id: 'duo-design-tour', device: 'duo', cat: 'Duo', name: 'Foldable design tour', note: 'Closed, landscape, portrait, then seated', dur: 10, hold: true,
    poses: ['book', 'portrait', 'seated'], at: 'center', view: [0.12, 0.22, -1], dist: 42,
    tracks: { fold: [[0, 0], [0.06, 0], [0.26, 1, 'quintInOut'], [0.66, 1], [0.9, 0.58, 'quintInOut'], [1, 0.58]], pose: [[0, 0], [0.34, 0], [0.5, 1, 'quintInOut'], [0.6, 1], [0.86, 2, 'quintInOut'], [1, 2]], dolly: [[0, 0.86], [0.26, 1, 'quintInOut'], [1, 0.96, 'sine']], orbit: [[0, 0.02], [1, -0.02, 'sine']] } },

  // ── Film moves ──────────────────────────────────────────────────────
  { id: 'duo-flip-reveal', device: 'duo', cat: 'Duo', name: 'Flip-open reveal', note: 'Cover, back, edge, then opens with the far half in soft focus', dur: 6.5, hold: true,
    poses: ['sym'], at: 'center', view: [0, 0.06, -1], dist: 38,
    tracks: {
      spin: [[0, 0.25], [0.28, 0.75, 'quintInOut'], [0.42, 1, 'cubic'], [1, 1]],
      fold: [[0, 0], [0.44, 0], [0.9, 1, 'quintInOut'], [1, 1]],
      blurL: [[0, 0.06], [0.7, 0.06], [0.97, 0, 'quintInOut']],
      dolly: [[0, 0.98], [0.42, 0.9, 'sine'], [1, 1.02, 'quintInOut']],
      glint: [[0, -0.4], [1, 0.5, 'sine']] } },
  { id: 'duo-open-turn', device: 'duo', cat: 'Duo', name: 'Open hero turn', note: 'Flat open display turns in and settles', dur: 4.5, hold: true,
    poses: ['book'], at: 'center', view: [0.18, 0.1, -1], dist: 37,
    tracks: { fold: [[0, 1], [1, 1]], spin: [[0, -0.14], [1, 0, 'quint']], dolly: [[0, 1.3], [1, 1, 'quint']], rise: [[0, -0.12], [1, 0, 'quint']], glint: [[0, 0.8], [1, -0.2, 'sine']] } },
  { id: 'duo-hinge-macro', device: 'duo', cat: 'Duo', name: 'Hinge macro', note: 'Down the hinge as it opens flat, then pulls back', dur: 7, hold: true,
    poses: ['sym'], pts: ['hingeEnd', 'center'], view: [0, 1, -0.5], dist: 11,
    tracks: { fold: [[0, 0.22], [0.58, 1, 'quintInOut'], [1, 1]], pan: [[0, 0], [0.58, 0], [1, 1, 'quintInOut']], rise: [[0, 0], [0.58, 0], [1, -0.82, 'quintInOut']], dolly: [[0, 1], [0.58, 1.05, 'sine'], [1, 3.4, 'quintInOut']], glint: [[0, -1], [0.6, 1, 'sine'], [1, 0.6, 'sine']] } },
  { id: 'duo-cover-handoff', device: 'duo', cat: 'Duo', name: 'Cover to inner', note: 'Cover screen sleeps, the inner display wakes as it opens', dur: 5, hold: true,
    poses: ['book'], at: 'center', view: [0.15, 0.06, -1], dist: 38,
    tracks: { fold: [[0, 0], [0.18, 0], [0.8, 1, 'quintInOut'], [1, 1]], outer: [[0, 1], [0.16, 1], [0.42, 0, 'sine']], dimL: [[0, 1], [0.6, 1], [0.92, 0, 'sine']], dimR: [[0, 1], [0.5, 1], [0.86, 0, 'sine']], dolly: [[0, 0.86], [1, 1, 'sine']] } },
];

// Screen showcase macros on the Duo's displays. The fold track holds the
// device open, half open or closed; the screen anchors follow the fold.
const OPEN = [[0, 1], [1, 1]];
duoMoves.push(
  { id: 'duo-crease-glide', showcase: true, device: 'duo', cat: 'Duo', name: 'Crease glide', note: 'Down the fold line of the open display', dur: 7, hold: true, pts: ['scrTop', 'scrBottom'], view: [0.32, 0.22, -1], dist: 17,
    tracks: { fold: OPEN, pan: [[0, 0], [1, 1, 'sine']], glint: [[0, -0.7], [1, 0.7, 'sine']] } },
  { id: 'duo-across-fold', showcase: true, device: 'duo', cat: 'Duo', name: 'Across the fold', note: 'Lateral track from one half of the app to the other', dur: 6.5, hold: true, pts: ['scrLeft', 'scrRight'], view: [0, 0.12, -1], dist: 17,
    tracks: { fold: OPEN, pan: [[0, 0], [1, 1, 'quintInOut']], orbit: [[0, 0.05], [1, -0.05, 'sine']] } },
  { id: 'duo-unfold-close', showcase: true, device: 'duo', cat: 'Duo', name: 'Unfold close-up', note: 'Macro as the display opens and the app sharpens', dur: 5, hold: true, at: 'scrMid', view: [0.15, 0.1, -1], dist: 24,
    tracks: { fold: [[0, 0.55], [0.85, 1, 'quintInOut'], [1, 1]], dolly: [[0, 1.2], [1, 0.95, 'quint']], glint: [[0, 0.5], [1, -0.3, 'sine']] } },
  { id: 'duo-book-drift', showcase: true, device: 'duo', cat: 'Duo', name: 'Open book drift', note: 'Half-open display, the camera arcs across both halves', dur: 7, hold: true, pts: ['scrLeft', 'scrRight'], view: [0, 0.25, -1], dist: 24,
    tracks: { fold: [[0, 0.72], [1, 0.72]], pan: [[0, 0], [1, 1, 'sine']], orbit: [[0, -0.06], [1, 0.06, 'sine']] } },
  { id: 'duo-cover-glide', showcase: true, device: 'duo', cat: 'Duo', name: 'Cover glide', note: 'Macro down the cover screen, closed', dur: 6, hold: true, pts: ['scrTop', 'scrBottom'], view: [0.22, 0.32, -1], dist: 13,
    tracks: { fold: [[0, 0], [1, 0]], pan: [[0, 0], [1, 1, 'sine']], glint: [[0, -0.5], [1, 0.5, 'sine']] } },
  { id: 'duo-corner-sweep', showcase: true, device: 'duo', cat: 'Duo', name: 'Corner to corner', note: 'Diagonal sweep across the full inner display', dur: 7, hold: true, pts: ['scrTL', 'scrBR'], view: [0.4, 0.2, -1], dist: 19,
    tracks: { fold: OPEN, pan: [[0, 0], [1, 1, 'cubic']], dolly: [[0, 0.95], [1, 1.05, 'sine']], twist: [[0, 0.012], [1, -0.012, 'sine']] } },
  { id: 'duo-wide-arc', showcase: true, device: 'duo', cat: 'Duo', name: 'Wide display arc', note: 'Slow arc around the open 7.6-inch display', dur: 7, hold: true, at: 'scrMid', view: [0, 0, -1], dist: 36,
    tracks: { fold: OPEN, orbit: [[0, 0.15], [1, -0.15, 'quintInOut']], rise: [[0, 0.12], [1, 0.02, 'sine']], glint: [[0, 0.8], [1, -0.8, 'sine']] } },
  { id: 'duo-low-horizon', showcase: true, device: 'duo', cat: 'Duo', name: 'Low horizon', note: 'From flat along the glass up to the open display', dur: 6, hold: true, at: 'scrMid', view: [0.06, 0, -1], dist: 42,
    tracks: { fold: OPEN, rise: [[0, -1.2], [1, 0, 'quintInOut']], dolly: [[0, 0.72], [1, 1, 'quintInOut']] } },
  { id: 'duo-punch-in', showcase: true, device: 'duo', cat: 'Duo', name: 'Punch in', note: 'Snap zoom onto the right half and settle', dur: 2.6, hold: true, at: 'scrRight', view: [-0.1, 0.08, -1], dist: 38,
    tracks: { fold: OPEN, dolly: [[0, 1], [0.38, 0.42, 'expoOut'], [1, 0.38, 'sine']] } },
  { id: 'duo-fold-rack', showcase: true, device: 'duo', cat: 'Duo', name: 'Fold rack', note: 'Settles on the left half, the crease, then the right', dur: 8, hold: true, pts: ['scrLeft', 'scrMid', 'scrRight'], view: [0.14, 0.1, -1], dist: 15,
    tracks: { fold: OPEN, pan: [[0, 0], [0.14, 0], [0.42, 1, 'quintInOut'], [0.6, 1], [0.88, 2, 'quintInOut'], [1, 2]], glint: [[0, -0.3], [1, 0.3, 'sine']] } },
);

export const duoMoveById = Object.fromEntries(duoMoves.map((m) => [m.id, m]));
export const isDuoMove = (move) => move?.device === 'duo';

const foldState = new WeakMap();
const THREE_ss = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const FX = ['blurL', 'blurR', 'dimL', 'dimR', 'outer'];
const FX_DEFAULT = { blurL: 0, blurR: 0, dimL: 0, dimR: 0, outer: 1 };
const saved = new WeakMap();
const first = (keys, d) => (keys ? keys[0][1] : d);

function poseAt(duo, move, index) {
  const poses = move.poses || ['book'];
  const f = Math.min(Math.max(index, 0), poses.length - 1), i = Math.min(poses.length - 2, Math.floor(f));
  if (poses.length < 2) duo.setPose(poses[0]);
  else duo.setPose(poses[i], poses[i + 1], f - i);
}

// Call once when a Duo move starts, BEFORE the director captures its base
// state: stores the viewer's pose, clears the root rotation (shots may tilt
// it) and puts the device in the move's first frame.
export function duoBegin(stage, move) {
  const duo = stage.duo, model = stage.model;
  if (!duo || !isDuoMove(move)) return false;
  if (!saved.has(stage)) saved.set(stage, { quat: model.quaternion.clone(), pos: model.position.clone(), progress: stage.progress });
  model.quaternion.identity(); model.position.set(0, 0, 0);
  const k = move.tracks;
  if (k.fold) stage.setProgress(first(k.fold));
  poseAt(duo, move, first(k.pose, 0));
  duo.setScreenFx(Object.fromEntries(FX.map((n) => [n, first(k[n], FX_DEFAULT[n])])));
  model.updateMatrixWorld(true);
  stage.mark();
  return true;
}

// Call every frame after the director has set the handset transform, with the
// director's channel reader v(name, default). Returns true when the geometry
// moved (fold or pose), so the director should re-read stage.points().
export function applyDuoChannels(stage, move, t, v) {
  const duo = stage.duo;
  if (!duo || !isDuoMove(move)) return false;
  const k = move.tracks;
  let moved = false;
  if (k.fold) {
    // Fold speed (per second) drives the screen handoff; at rest it fades out.
    const f = v('fold'), last = foldState.get(stage);
    const rate = last && t !== last.t ? Math.abs((f - last.f) / ((t - last.t) * move.dur)) : 0;
    foldState.set(stage, { f, t });
    duo.setFoldMotion(THREE_ss(rate, .04, .3));
    stage.setProgress(f); moved = true;
  }
  if (k.pose || (move.poses && move.poses.length === 1)) { poseAt(duo, move, v('pose', 0)); moved = true; }
  duo.setScreenFx(Object.fromEntries(FX.map((n) => [n, v(n, FX_DEFAULT[n])])));
  if (moved) stage.model.updateMatrixWorld(true);
  stage.mark();
  return moved;
}

// Call after the director's reset: back to the viewer's pose, the plain book
// orientation and clean screens.
export function resetDuoChannels(stage) {
  const duo = stage.duo;
  if (!duo) return;
  foldState.delete(stage); duo.setFoldMotion(0);
  duo.setPose('book'); duo.setScreenFx();
  const s = saved.get(stage);
  if (s) {
    saved.delete(stage);
    if (stage.device === 'duo') {
      stage.model.quaternion.copy(s.quat); stage.model.position.copy(s.pos);
      if (stage.progress !== s.progress) stage.setProgress(s.progress);
    }
  }
  stage.mark();
}
