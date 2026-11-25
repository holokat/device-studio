import * as THREE from 'three';
import { duoMoves, duoBegin, applyDuoChannels, resetDuoChannels } from './duo/moves.js';

// Keyframed camera and handset moves in the style of product-launch films.
// Each channel is a list of [time, value, ease] keys on a 0…1 timeline; the ease
// shapes the segment that ends on that key.
//   spin    turns about the handset's long axis       tumble  turns end over end
//   twist   turns in the screen plane (dutch angle)   orbit   camera turns about world up
//   rise    camera elevation change in radians        dolly   camera distance multiplier
//   lift    handset world height offset               slide   handset offset along camera right
//   explode assembly separation 0…1                   focus   aim from the start target toward `at` 0…1
//   glint   light-rig rotation in radians: slides reflections across the metal
//   pan     fractional index into `pts`: racks the aim across hardware points
// Optional move fields: `at` (aim point, default 'array'), `pts` (points for pan),
// `view` [x,y,z] + `dist` (cut to a camera direction in the handset's own frame
// at that distance, for macro set-ups), `hold` (keep the final frame),
// `screenSide` mirrors the orbit so the camera swings in from the side the
// display faces, keeping the screen in view from angled compositions.
// `face` ('screen' default, or 'back'): the side turned toward the camera at
// spin 0. The director flips the handset when the other side is showing, so
// moves land on the display unless they are about the camera hardware.

const out = (f) => (t) => 1 - f(1 - t);
const inCubic = (t) => t * t * t;
const inQuint = (t) => t ** 5;
const inExpo = (t) => (t === 0 ? 0 : 2 ** (10 * t - 10));
const inOut = (f) => (t) => (t < 0.5 ? f(2 * t) / 2 : 1 - f(2 - 2 * t) / 2);
const back = (s = 1.70158) => (t) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;

export const easings = {
  lin: (t) => t,
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  cubic: inOut(inCubic),
  quint: out(inQuint),
  quintInOut: inOut(inQuint),
  expoOut: out(inExpo),
  expoInOut: inOut(inExpo),
  in: inCubic,
  back: back(1.4),
  softBack: back(0.9),
};

export const moves = [
  { id: 'hero-reveal', name: 'Hero reveal', note: 'Rising full turn with a slow push, display first and last', dur: 4.5,
    tracks: { spin: [[0, -1], [1, 0, 'quint']], dolly: [[0, 1.35], [1, 1, 'quint']], rise: [[0, -0.14], [1, 0, 'quint']] } },
  { id: 'quick-spin', name: 'Quick spin', note: 'One fast turn on the long axis', dur: 1.6,
    tracks: { spin: [[0, 0], [1, 1, 'expoInOut']] } },
  { id: 'double-spin', name: 'Double spin', note: 'Two turns, hard in and out', dur: 2.2,
    tracks: { spin: [[0, 0], [1, 2, 'expoInOut']] } },
  { id: 'flip-display', name: 'Flip to display', note: 'Anticipation, a full flip, snaps back to the screen', dur: 1.8, hold: true,
    tracks: { spin: [[0, 0], [0.18, -0.035, 'sine'], [1, 1, 'expoOut']] } },
  { id: 'turntable', name: 'Slow turntable', note: 'Even 360° camera orbit, loops', dur: 9, loop: true,
    tracks: { orbit: [[0, 0], [1, 1, 'lin']] } },
  { id: 'push-in', name: 'Slow push', note: 'Gentle dolly toward the device', dur: 5, hold: true,
    tracks: { dolly: [[0, 1.12], [1, 0.62, 'sine']] } },
  { id: 'pull-reveal', name: 'Pull-back reveal', note: 'Start inside the app, pull out wide', dur: 4, at: 'scrUpper',
    tracks: { dolly: [[0, 0.36], [1, 1, 'quint']], focus: [[0, 1], [1, 0, 'quint']] } },
  { id: 'macro-sweep', face: 'back', name: 'Lens macro sweep', note: 'Close pass across the camera array', dur: 5, hold: true,
    tracks: { focus: [[0, 1], [1, 1]], dolly: [[0, 0.34], [1, 0.29, 'sine']], orbit: [[0, -0.07], [1, 0.07, 'sine']], rise: [[0, 0.12], [1, -0.06, 'sine']] } },
  { id: 'tumble-drop', name: 'Tumble drop', note: 'Falls in end over end and lands', dur: 2.4,
    tracks: { lift: [[0, 20], [0.78, 0, 'expoOut'], [1, 0]], tumble: [[0, -1.25], [0.82, 0, 'expoOut'], [1, 0]] } },
  { id: 'float', name: 'Hover float', note: 'Weightless bob and sway, loops', dur: 6, loop: true,
    tracks: { lift: [[0, 0], [0.5, 0.55, 'sine'], [1, 0, 'sine']], twist: [[0, -0.008], [0.5, 0.008, 'sine'], [1, -0.008, 'sine']], spin: [[0, -0.025], [0.5, 0.025, 'sine'], [1, -0.025, 'sine']] } },
  { id: 'edge-reveal', name: 'Edge reveal', note: 'Turns to profile to show thinness', dur: 4,
    tracks: { spin: [[0, 0], [0.38, 0.25, 'quintInOut'], [0.66, 0.25], [1, 0, 'quintInOut']] } },
  { id: 'whip-pan', screenSide: true, name: 'Whip pan', note: 'Whips in from the side and settles on the display', dur: 1.4, hold: true,
    tracks: { orbit: [[0, -0.16], [0.72, 0.012, 'expoInOut'], [1, 0, 'sine']] } },
  { id: 'orbit-rise', name: 'Orbit crane', note: 'Orbit while the camera rises', dur: 5,
    tracks: { orbit: [[0, -0.08], [1, 0.08, 'sine']], rise: [[0, -0.24], [1, 0.26, 'sine']] } },
  { id: 'dutch-spin', name: 'Dutch settle', note: 'Tilted quarter turn that levels out', dur: 2.6,
    tracks: { twist: [[0, 0.07], [1, 0, 'quint']], spin: [[0, -0.08], [1, 0, 'quint']], dolly: [[0, 1.22], [1, 1, 'quint']] } },
  { id: 'explode-orbit', name: 'Exploded orbit', note: 'Layers part, orbit, then close', dur: 6,
    tracks: { explode: [[0, 0], [0.3, 1, 'quintInOut'], [0.7, 1], [1, 0, 'quintInOut']], orbit: [[0, 0], [1, 0.22, 'sine']], dolly: [[0, 1], [0.3, 1.5, 'quintInOut'], [0.7, 1.5], [1, 1, 'quintInOut']] } },
  { id: 'layer-push', name: 'Layer push', note: 'Explode with a push into the stack', dur: 4, hold: true,
    tracks: { explode: [[0, 0], [0.55, 1, 'expoInOut'], [1, 1]], dolly: [[0, 1], [0.55, 1.55, 'expoInOut'], [1, 1.25, 'sine']] } },
  { id: 'slide-in', name: 'Slide in', note: 'Enters from the left and settles', dur: 2.2,
    tracks: { slide: [[0, -30], [1, 0, 'expoOut']], spin: [[0, -0.05], [1, 0, 'expoOut']] } },
  { id: 'spin-settle', name: 'Spin and settle', note: 'Full turn with an elastic overshoot', dur: 2.4,
    tracks: { spin: [[0, 0], [1, 1, 'back']] } },
  { id: 'crane-down', name: 'Top-down reveal', note: 'From overhead down to eye level', dur: 4,
    tracks: { rise: [[0, 0.9], [1, 0, 'quint']], dolly: [[0, 1.18], [1, 1, 'quint']] } },
  { id: 'backflip', name: 'Backflip', note: 'Full end-over-end flip', dur: 2,
    tracks: { tumble: [[0, 0], [1, 1, 'expoInOut']], lift: [[0, 0], [0.5, 3, 'sine'], [1, 0, 'sine']] } },
  // ── Macro and detail ──────────────────────────────────────────────
  { id: 'main-lens-glide', name: 'Main lens glide', note: 'Low macro drift across the 48MP main lens', dur: 6, hold: true, at: 'main', view: [0.32, -0.18, 1], dist: 5.4,
    tracks: { orbit: [[0, -0.045], [1, 0.045, 'sine']], dolly: [[0, 1.12], [1, 0.86, 'sine']], glint: [[0, -0.9], [1, 0.9, 'sine']] } },
  { id: 'lens-rack', name: 'Lens rack', note: 'Pans telephoto, main, then ultra wide', dur: 7, hold: true, pts: ['tele', 'main', 'ultra'], view: [0.2, -0.05, 1], dist: 6,
    tracks: { pan: [[0, 0], [0.12, 0], [0.45, 1, 'quintInOut'], [0.6, 1], [0.93, 2, 'quintInOut'], [1, 2]], orbit: [[0, 0.03], [1, -0.03, 'sine']], glint: [[0, 0.4], [1, -0.4, 'sine']] } },
  { id: 'flash-glint', name: 'Flash glint', note: 'Light skims the flash and LiDAR window', dur: 4.5, hold: true, at: 'flash', view: [-0.35, 0.1, 1], dist: 4.6,
    tracks: { glint: [[0, -1.6], [1, 1.6, 'sine']], dolly: [[0, 1.08], [1, 0.92, 'sine']], orbit: [[0, 0.02], [1, -0.02, 'sine']] } },
  { id: 'island-macro', name: 'Island close-up', note: 'Slow push on the front sensor island', dur: 5, hold: true, at: 'island', view: [0.18, 0.12, -1], dist: 6,
    tracks: { dolly: [[0, 1.25], [1, 0.82, 'quint']], orbit: [[0, -0.03], [1, 0.02, 'sine']], glint: [[0, 0.5], [1, -0.5, 'sine']] } },
  { id: 'usb-c-reveal', name: 'USB‑C reveal', note: 'Rises over the bottom edge to the port', dur: 5, hold: true, at: 'usb', view: [0.12, -1, -0.35], dist: 6.5,
    tracks: { rise: [[0, -0.42], [1, 0.05, 'quint']], dolly: [[0, 1.2], [1, 0.9, 'quint']], glint: [[0, -0.6], [1, 0.6, 'sine']] } },
  { id: 'camera-control', name: 'Camera Control', note: 'Tracks along the side rail to the button', dur: 5, hold: true, at: 'control', view: [-1, 0.05, 0.28], dist: 6.5,
    tracks: { orbit: [[0, 0.06], [1, -0.02, 'quint']], rise: [[0, 0.35], [1, 0.02, 'quint']], dolly: [[0, 1.25], [1, 0.9, 'quint']], glint: [[0, 1], [1, -0.4, 'sine']] } },
  { id: 'edge-skim', name: 'Edge skim', note: 'Grazing pass down the titanium rail', dur: 6, hold: true, at: 'action', view: [1, 0.02, 0.12], dist: 10,
    tracks: { pan: [[0, 0], [1, 1, 'sine']], orbit: [[0, -0.02], [1, 0.03, 'sine']], glint: [[0, -1.2], [1, 1.2, 'sine']] }, pts: ['action', 'railLow'] },
  { id: 'light-sweep', name: 'Light sweep', note: 'A soft highlight travels across the display', dur: 4,
    tracks: { glint: [[0, -2.2], [1, 2.2, 'sine']], spin: [[0, -0.03], [1, 0.03, 'sine']] } },
  { id: 'exploded-macro', name: 'Exploded macro', note: 'Optics separate in a lens close-up', dur: 6, hold: true, at: 'array', view: [-0.5, 0.15, 1], dist: 34,
    tracks: { explode: [[0, 0], [0.55, 1, 'quintInOut'], [1, 1]], orbit: [[0, 0.04], [1, -0.06, 'sine']], dolly: [[0, 0.85], [1, 1.1, 'sine']] } },
  // ── Screen macro: slow lens moves across the app on the display ─────
  { id: 'screen-glide', name: 'Screen glide', note: 'Low macro drift down the display, top to bottom', dur: 7, hold: true, pts: ['scrTop', 'scrBottom'], view: [0.22, 0.42, -1], dist: 14,
    tracks: { pan: [[0, 0], [1, 1, 'sine']], orbit: [[0, -0.02], [1, 0.02, 'sine']], glint: [[0, -0.5], [1, 0.5, 'sine']] } },
  { id: 'screen-rise', name: 'Screen rise', note: 'Grazing tilt up the display from the bottom edge', dur: 7, hold: true, pts: ['scrBottom', 'scrTop'], view: [-0.12, -0.75, -1], dist: 15,
    tracks: { pan: [[0, 0], [1, 1, 'quintInOut']], rise: [[0, -0.12], [1, 0.08, 'sine']], glint: [[0, 0.6], [1, -0.6, 'sine']] } },
  { id: 'screen-diagonal', name: 'Diagonal sweep', note: 'Corner to corner across the interface', dur: 6.5, hold: true, pts: ['scrTL', 'scrBR'], view: [0.45, 0.2, -1], dist: 15,
    tracks: { pan: [[0, 0], [1, 1, 'cubic']], orbit: [[0, 0.03], [1, -0.03, 'sine']], dolly: [[0, 0.95], [1, 1.05, 'sine']] } },
  { id: 'screen-rack', name: 'UI rack focus', note: 'Settles on the top, middle, then bottom of the app', dur: 8, hold: true, pts: ['scrUpper', 'scrMid', 'scrLower'], view: [0.18, 0.08, -1], dist: 13,
    tracks: { pan: [[0, 0], [0.14, 0], [0.42, 1, 'quintInOut'], [0.6, 1], [0.88, 2, 'quintInOut'], [1, 2]], orbit: [[0, -0.025], [1, 0.025, 'sine']], glint: [[0, -0.3], [1, 0.3, 'sine']] } },
  { id: 'screen-cross', name: 'Cross pan', note: 'Lateral track across the middle of the app', dur: 6, hold: true, pts: ['scrLeft', 'scrRight'], view: [0, 0.15, -1], dist: 13,
    tracks: { pan: [[0, 0], [1, 1, 'sine']], orbit: [[0, 0.05], [1, -0.05, 'sine']], twist: [[0, 0.012], [1, -0.012, 'sine']] } },
  { id: 'screen-arc', name: 'Display arc', note: 'Slow arc around the centre of the screen', dur: 7, hold: true, at: 'scrMid', view: [0, 0, -1], dist: 22,
    tracks: { orbit: [[0, -0.075], [1, 0.075, 'sine']], rise: [[0, 0.1], [1, -0.04, 'sine']], dolly: [[0, 1.05], [1, 0.9, 'sine']], glint: [[0, -0.8], [1, 0.8, 'sine']] } },
  { id: 'glass-glint', name: 'Glass glint', note: 'A highlight rolls across the display glass', dur: 5, hold: true, at: 'scrMid', view: [0.55, 0.12, -1], dist: 34,
    tracks: { glint: [[0, -2], [1, 2, 'sine']], orbit: [[0, 0.02], [1, -0.02, 'sine']], dolly: [[0, 1.04], [1, 0.96, 'sine']] } },
  { id: 'corner-macro', name: 'Corner macro', note: 'Push into the top corner of the interface', dur: 5, hold: true, at: 'scrTL', view: [-0.3, 0.35, -1], dist: 11,
    tracks: { dolly: [[0, 1.5], [1, 0.95, 'quint']], orbit: [[0, -0.03], [1, 0.015, 'sine']], glint: [[0, 0.4], [1, -0.4, 'sine']] } },
  { id: 'low-tilt-up', name: 'Low tilt-up', note: 'From flat along the glass up to the full screen', dur: 6, hold: true, at: 'scrMid', view: [0.08, 0, -1], dist: 36,
    tracks: { rise: [[0, -1.25], [1, 0, 'quintInOut']], dolly: [[0, 0.7], [1, 1, 'quintInOut']], glint: [[0, 0.9], [1, 0, 'sine']] } },
  { id: 'push-to-app', name: 'Push into app', note: 'Full device push into the middle of the screen', dur: 5, hold: true, at: 'scrMid',
    tracks: { focus: [[0, 0], [1, 1, 'quintInOut']], dolly: [[0, 1.1], [1, 0.42, 'quintInOut']], spin: [[0, -0.06], [1, 0, 'quint']] } },
  // ── iPhone 18 Pro screen showcase ───────────────────────────────
  { id: 'pro-island-drop', showcase: true, device: 'pro', name: 'Island drop', note: 'From the Dynamic Island down into the app', dur: 6.5, hold: true, pts: ['island', 'scrUpper', 'scrMid'], view: [0.12, 0.35, -1], dist: 10,
    tracks: { pan: [[0, 0], [0.12, 0], [0.5, 1, 'quintInOut'], [0.62, 1], [1, 2, 'quintInOut']], dolly: [[0, 0.75], [1, 1.2, 'sine']], glint: [[0, -0.4], [1, 0.4, 'sine']] } },
  { id: 'pro-status-skim', showcase: true, device: 'pro', name: 'Status bar skim', note: 'Grazing pass along the top of the interface', dur: 5.5, hold: true, pts: ['scrStatus', 'scrTR'], view: [0, -0.45, -1], dist: 9,
    tracks: { pan: [[0, 0], [1, 1, 'sine']], rise: [[0, -0.1], [1, 0.05, 'sine']], glint: [[0, 0.8], [1, -0.8, 'sine']] } },
  { id: 'pro-edge-to-screen', showcase: true, device: 'pro', name: 'Edge to screen', note: 'Starts on the rail, swings round onto the app', dur: 5.5, hold: true, at: 'scrMid', view: [0.12, 0.05, -1], dist: 22,
    tracks: { orbit: [[0, 0.22], [1, 0, 'quintInOut']], dolly: [[0, 0.62], [1, 1, 'quintInOut']], glint: [[0, -1], [1, 0.3, 'sine']] } },
  { id: 'pro-home-rise', showcase: true, device: 'pro', name: 'Home bar rise', note: 'Up from the home indicator through the app', dur: 6.5, hold: true, pts: ['scrHome', 'scrLower', 'scrMid'], view: [0.08, -0.65, -1], dist: 11,
    tracks: { pan: [[0, 0], [1, 2, 'quintInOut']], rise: [[0, -0.18], [1, 0.04, 'sine']], dolly: [[0, 0.85], [1, 1.1, 'sine']] } },
  { id: 'pro-pull-pixels', showcase: true, device: 'pro', name: 'Pull from pixels', note: 'Starts inside the UI, pulls out to the full display', dur: 5, hold: true, at: 'scrMid', view: [0.1, 0.06, -1], dist: 36,
    tracks: { dolly: [[0, 0.18], [1, 1, 'quintInOut']], orbit: [[0, -0.03], [1, 0.02, 'sine']], twist: [[0, 0.015], [1, 0, 'quint']] } },
  { id: 'pro-dutch-glide', showcase: true, device: 'pro', name: 'Dutch glide', note: 'Tilted diagonal drift across the content', dur: 6, hold: true, pts: ['scrTR', 'scrBL'], view: [-0.3, 0.25, -1], dist: 13,
    tracks: { pan: [[0, 0], [1, 1, 'cubic']], twist: [[0, 0.035], [1, -0.015, 'sine']], glint: [[0, 0.5], [1, -0.5, 'sine']] } },
  { id: 'pro-reflection-pass', showcase: true, device: 'pro', name: 'Reflection pass', note: 'Studio light rolls over the upper UI', dur: 5, hold: true, at: 'scrUpper', view: [0.28, 0.3, -1], dist: 17,
    tracks: { glint: [[0, -2.6], [1, 2.6, 'lin']], orbit: [[0, 0.02], [1, -0.02, 'sine']], dolly: [[0, 1.05], [1, 0.95, 'sine']] } },
  { id: 'pro-orbit-app', showcase: true, device: 'pro', name: 'Orbit the app', note: 'Wide arc around the display, screen held centre', dur: 7, hold: true, at: 'scrMid', view: [0, 0, -1], dist: 24,
    tracks: { orbit: [[0, 0.17], [1, -0.17, 'quintInOut']], rise: [[0, 0.14], [1, 0.03, 'sine']], glint: [[0, 0.9], [1, -0.9, 'sine']] } },
  { id: 'pro-reading-drift', showcase: true, device: 'pro', name: 'Reading drift', note: 'Slow scroll-speed drift up and down the app, loops', dur: 10, loop: true, pts: ['scrUpper', 'scrLower'], view: [0.16, 0.12, -1], dist: 13,
    tracks: { pan: [[0, 0], [0.5, 1, 'sine'], [1, 0, 'sine']], orbit: [[0, -0.015], [0.5, 0.015, 'sine'], [1, -0.015, 'sine']] } },
  { id: 'pro-snap-zoom', showcase: true, device: 'pro', name: 'Snap zoom', note: 'Punches in on the app and settles', dur: 2.6, hold: true, at: 'scrUpper', view: [0.12, 0.08, -1], dist: 32,
    tracks: { dolly: [[0, 1], [0.38, 0.4, 'expoOut'], [1, 0.36, 'sine']], twist: [[0, -0.01], [0.38, 0.004, 'expoOut'], [1, 0, 'sine']] } },
  // ── iPad screen showcase (11-inch display, 23.7 × 16.5 cm active area) ──
  { id: 'ipad-landscape-sweep', showcase: true, device: 'ipad', name: 'Landscape sweep', note: 'Long macro track along the display', dur: 8, hold: true, pts: ['scrTop', 'scrBottom'], view: [0.18, 0.3, -1], dist: 24,
    tracks: { pan: [[0, 0], [1, 1, 'sine']], orbit: [[0, -0.02], [1, 0.02, 'sine']], glint: [[0, -0.6], [1, 0.6, 'sine']] } },
  { id: 'ipad-pencil-height', showcase: true, device: 'ipad', name: 'Pencil height', note: 'Grazing glide just above the glass', dur: 7, hold: true, pts: ['scrBL', 'scrTR'], view: [0.12, -0.85, -0.7], dist: 26,
    tracks: { pan: [[0, 0], [1, 1, 'cubic']], rise: [[0, -0.06], [1, 0.06, 'sine']], glint: [[0, 0.9], [1, -0.9, 'sine']] } },
  { id: 'ipad-canvas-push', showcase: true, device: 'ipad', name: 'Canvas push', note: 'Slow push from the full display into the app', dur: 6, hold: true, at: 'scrMid', view: [0.1, 0.06, -1], dist: 62,
    tracks: { dolly: [[0, 1.08], [1, 0.46, 'quintInOut']], orbit: [[0, -0.025], [1, 0.015, 'sine']] } },
  { id: 'ipad-corner-macro', showcase: true, device: 'ipad', name: 'Corner push', note: 'Push into the top corner of the interface', dur: 5, hold: true, at: 'scrTR', view: [0.3, 0.3, -1], dist: 17,
    tracks: { dolly: [[0, 1.45], [1, 0.95, 'quint']], orbit: [[0, 0.03], [1, -0.01, 'sine']], glint: [[0, -0.4], [1, 0.4, 'sine']] } },
  { id: 'ipad-grand-arc', showcase: true, device: 'ipad', name: 'Grand arc', note: 'Wide arc around the whole display', dur: 8, hold: true, at: 'scrMid', view: [0, 0, -1], dist: 58,
    tracks: { orbit: [[0, 0.16], [1, -0.16, 'quintInOut']], rise: [[0, 0.12], [1, 0.02, 'sine']], glint: [[0, 0.9], [1, -0.9, 'sine']] } },
  { id: 'ipad-app-rack', showcase: true, device: 'ipad', name: 'App rack focus', note: 'Settles on three areas of the app in turn', dur: 8, hold: true, pts: ['scrUpper', 'scrMid', 'scrLower'], view: [0.16, 0.08, -1], dist: 22,
    tracks: { pan: [[0, 0], [0.14, 0], [0.42, 1, 'quintInOut'], [0.6, 1], [0.88, 2, 'quintInOut'], [1, 2]], glint: [[0, -0.3], [1, 0.3, 'sine']] } },
  { id: 'ipad-low-tilt', showcase: true, device: 'ipad', name: 'Horizon rise', note: 'From flat along the glass up to the full display', dur: 6.5, hold: true, at: 'scrMid', view: [0.06, 0, -1], dist: 62,
    tracks: { rise: [[0, -1.2], [1, 0, 'quintInOut']], dolly: [[0, 0.7], [1, 1, 'quintInOut']] } },
  { id: 'ipad-glass-roll', showcase: true, device: 'ipad', name: 'Glass roll', note: 'A wide highlight rolls across the display', dur: 5.5, hold: true, at: 'scrMid', view: [0.5, 0.14, -1], dist: 54,
    tracks: { glint: [[0, -2.2], [1, 2.2, 'sine']], orbit: [[0, 0.02], [1, -0.02, 'sine']] } },
  { id: 'ipad-snap-zoom', showcase: true, device: 'ipad', name: 'Snap zoom', note: 'Punches in on the app and settles', dur: 2.6, hold: true, at: 'scrUpper', view: [0.12, 0.08, -1], dist: 52,
    tracks: { dolly: [[0, 1], [0.38, 0.42, 'expoOut'], [1, 0.38, 'sine']], twist: [[0, -0.01], [0.38, 0.004, 'expoOut'], [1, 0, 'sine']] } },
  { id: 'ipad-split-drift', showcase: true, device: 'ipad', name: 'Split view drift', note: 'Floats from one side of the layout to the other, loops', dur: 10, loop: true, pts: ['scrLeft', 'scrRight'], view: [0, 0.15, -1], dist: 26,
    tracks: { pan: [[0, 0], [0.5, 1, 'sine'], [1, 0, 'sine']], lift: [[0, 0], [0.5, 0.4, 'sine'], [1, 0, 'sine']] } },
  // ── Combinations ──────────────────────────────────────────────────
  { id: 'slide-flip', face: 'back', name: 'Slide‑in flip', note: 'Slides in on its back, flips to the display', dur: 3, hold: true,
    tracks: { slide: [[0, 30], [0.55, 0, 'expoOut']], spin: [[0, 0.3], [0.45, 0, 'expoOut'], [0.58, -0.02, 'sine'], [1, 0.5, 'expoInOut']] } },
  { id: 'spin-to-lens', face: 'back', name: 'Spin to lens', note: 'One fast turn, then dives into the array', dur: 3.6, hold: true,
    tracks: { spin: [[0, 0], [0.42, 1, 'expoInOut']], focus: [[0, 0], [0.38, 0], [1, 1, 'quintInOut']], dolly: [[0, 1], [0.38, 1.04, 'sine'], [1, 0.3, 'quintInOut']] } },
  { id: 'lens-to-screen', face: 'back', name: 'Lens to screen', note: 'Macro on the lenses, pull out, flip to display', dur: 5, hold: true,
    tracks: { focus: [[0, 1], [0.5, 0, 'quintInOut']], dolly: [[0, 0.32], [0.5, 1, 'quintInOut']], spin: [[0, 0], [0.52, 0], [1, 0.5, 'expoInOut']] } },
  { id: 'rise-and-turn', name: 'Rise and turn', note: 'Rises from below frame spinning to rest', dur: 2.8,
    tracks: { lift: [[0, -22], [0.85, 0, 'expoOut'], [1, 0]], spin: [[0, -2], [1, 0, 'expoOut']], rise: [[0, -0.15], [1, 0, 'quint']] } },
  { id: 'drop-flip', face: 'back', name: 'Drop and flip', note: 'Falls in face-down and flips face-up', dur: 3, hold: true,
    tracks: { lift: [[0, 18], [0.5, 0, 'expoOut']], tumble: [[0, -0.6], [0.5, 0, 'expoOut']], spin: [[0, 0], [0.55, 0], [1, 0.5, 'expoInOut']] } },
  { id: 'whip-to-macro', face: 'back', name: 'Whip to macro', note: 'Whip pan that lands on the lenses', dur: 2.4, hold: true,
    tracks: { orbit: [[0, -0.22], [0.6, 0.01, 'expoOut'], [1, 0, 'sine']], focus: [[0, 0], [0.25, 0], [0.85, 1, 'quintInOut']], dolly: [[0, 1.2], [0.85, 0.34, 'quintInOut'], [1, 0.32, 'sine']] } },
  { id: 'hero-loop', name: 'Hero loop', note: 'Product-page float with a slow turn, loops', dur: 12, loop: true,
    tracks: { spin: [[0, 0], [1, 1, 'lin']], lift: [[0, 0], [0.25, 0.5, 'sine'], [0.5, 0, 'sine'], [0.75, 0.5, 'sine'], [1, 0, 'sine']], glint: [[0, 0], [0.5, 0.6, 'sine'], [1, 0, 'sine']] } },
];

export const moveById = Object.fromEntries([...moves, ...duoMoves].map((m) => [m.id, m]));

function channel(keys, t) {
  if (!keys) return null;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i += 1) {
    const [t1, v1, ease = 'cubic'] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const span = t1 - t0 || 1;
      return v0 + (v1 - v0) * easings[ease]((t - t0) / span);
    }
  }
  return keys[keys.length - 1][1];
}

// Hardware points in the handset's own frame (scene units are centimetres).
const POINTS = Object.fromEntries(Object.entries({
  array: [-0.16, 5.04, 0.52], main: [-0.45, 5.22, 0.74], ultra: [-2.14, 6.13, 0.74], tele: [-2.14, 4.32, 0.74],
  flash: [2.16, 5.7, 0.7], island: [0, 6.92, -0.44], usb: [0, -7.2, 0], control: [-3.62, -2.72, 0],
  action: [3.62, 3.2, 0], railLow: [3.62, -3.4, 0],
  // Display surface (active area 6.77 × 14.55 cm on z = −0.44).
  scrTop: [0, 5.4, -0.44], scrUpper: [0, 2.8, -0.44], scrMid: [0, 0, -0.44], scrLower: [0, -2.8, -0.44], scrBottom: [0, -5.4, -0.44],
  scrTL: [-2.2, 5.2, -0.44], scrTR: [2.2, 5.2, -0.44], scrBL: [-2.2, -5.2, -0.44], scrBR: [2.2, -5.2, -0.44],
  scrLeft: [-2.1, 0.6, -0.44], scrRight: [2.1, -0.6, -0.44],
  scrStatus: [-2.25, 6.62, -0.44], scrHome: [0, -6.9, -0.44],
}).map(([k, p]) => [k, new THREE.Vector3(...p)]));
const AXIS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

// Point maps per device. The Duo's hardware moves with the fold, so the stage
// supplies its anchors live (see stage.points()); missing names fall back to
// the camera array.
export const devicePoints = { pro: POINTS, duo: null };

export function createDirector(stage) {
  const { camera, control } = stage;
  let base = null;
  const q = new THREE.Quaternion(), turn = new THREE.Quaternion(), qBase = new THREE.Quaternion();
  const toCam = new THREE.Vector3();
  const offset = new THREE.Vector3(), target = new THREE.Vector3(), lens = new THREE.Vector3();
  const sph = new THREE.Spherical();
  const qWorld = new THREE.Quaternion(), dir = new THREE.Vector3();

  // Composition views put the handset inside a posed (rotated, scaled) group,
  // so every handset-frame direction and point goes through that parent.
  function parentFrame(model) {
    const parent = model.parent;
    if (!parent) return { pMat: new THREE.Matrix4(), pQuat: new THREE.Quaternion(), pInv: new THREE.Quaternion(), pScale: 1 };
    parent.updateWorldMatrix(true, false);
    const pQuat = parent.getWorldQuaternion(new THREE.Quaternion());
    return { pMat: parent.matrixWorld.clone(), pQuat, pInv: pQuat.clone().invert(), pScale: parent.getWorldScale(new THREE.Vector3()).x || 1 };
  }

  function begin() {
    reset();
    const model = stage.model;
    model.updateMatrixWorld(true);
    const frame = parentFrame(model);
    base = {
      model, ...frame, fov: camera.fov, points: stage.points?.() || POINTS,
      pos: camera.position.clone(), target: control.target.clone(),
      mPos: model.position.clone(), mQuat: model.quaternion.clone(), progress: stage.progress,
      right: new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize(),
      env: stage.scene.environmentRotation.y,
      // Spin about whichever in-plane handset axis is closest to world up
      // (the long axis in portrait, the short axis for a landscape iPad);
      // tumble about the other one.
      ...(() => {
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(frame.pQuat.clone().multiply(model.quaternion).invert());
        const yUp = Math.abs(up.y) >= Math.abs(up.x);
        const spinAxis = yUp ? new THREE.Vector3(0, Math.sign(up.y) || 1, 0) : new THREE.Vector3(Math.sign(up.x), 0, 0);
        const tumbleAxis = yUp ? AXIS.x.clone() : new THREE.Vector3(0, -Math.sign(up.x), 0);
        return { spinAxis, tumbleAxis };
      })(),
      // Shared moves are framed for a 15 cm phone; scale their distances to
      // the device. Device-specific moves are authored at their own scale.
      scale: { ipad: 1.6 }[stage.device] || 1,
    };
  }

  function apply(move, t) {
    if (!base) begin();
    if (move.device === 'duo' && base.duoFor !== move.id) {
      base.duoFor = move.id; duoBegin(stage, move);
      base.mQuat.copy(base.model.quaternion); base.mPos.copy(base.model.position);
      base.points = stage.points(); base.faceFor = null; base.spinAxis = AXIS.y.clone(); base.tumbleAxis = AXIS.x.clone();
    }
    const model = base.model;
    const k = move.tracks, v = (name, d = 0) => channel(k[name], t) ?? d;
    const tau = Math.PI * 2;
    // Turn the requested face toward the camera. The screen faces −Z in the
    // handset frame; flip half a turn when the camera sees the other side.
    if (base.faceFor !== move.id) {
      base.faceFor = move.id;
      toCam.copy(base.pos).sub(dir.copy(base.mPos).applyMatrix4(base.pMat)).applyQuaternion(qWorld.copy(base.pQuat).multiply(base.mQuat).invert());
      const seesScreen = toCam.z < 0;
      base.flip = move.view ? 0 : (move.face === 'back') === seesScreen ? 0.5 : 0;
      qBase.copy(base.mQuat).multiply(turn.setFromAxisAngle(base.spinAxis, base.flip * tau));
      base.orbitSign = 1;
      if (move.screenSide) {
        const n = dir.set(0, 0, -1).applyQuaternion(qBase).applyQuaternion(base.pQuat);
        const cam = offset.copy(base.pos).sub(base.target);
        const d = Math.atan2(Math.sin(Math.atan2(n.x, n.z) - Math.atan2(cam.x, cam.z)), Math.cos(Math.atan2(n.x, n.z) - Math.atan2(cam.x, cam.z)));
        const first = k.orbit?.[0]?.[1] || 0;
        if (first * d < 0) base.orbitSign = -1;
      }
    }
    q.copy(qBase);
    if (k.spin) q.multiply(turn.setFromAxisAngle(base.spinAxis, v('spin') * tau));
    if (k.tumble) q.multiply(turn.setFromAxisAngle(base.tumbleAxis, v('tumble') * tau));
    if (k.twist) q.multiply(turn.setFromAxisAngle(AXIS.z, v('twist') * tau));
    model.quaternion.copy(q);
    model.position.copy(base.mPos);
    // Lift is world up and slide is camera right, whatever the parent pose.
    if (k.lift) model.position.addScaledVector(dir.set(0, 1, 0).applyQuaternion(base.pInv), v('lift') / base.pScale);
    if (k.slide) model.position.addScaledVector(dir.copy(base.right).applyQuaternion(base.pInv), v('slide') / base.pScale);

    // A fold changes where the Duo's parts are, so refresh live anchors first.
    if (k.explode) stage.setProgress(v('explode'));
    const duoMoved = move.device === 'duo' && applyDuoChannels(stage, move, t, v);
    const pts = (k.explode || duoMoved) && base.points !== POINTS ? stage.points() : base.points;
    const entry = (name) => pts[name] || pts.array;
    const world = (name) => { const e = entry(name); return lens.copy(e.isVector3 ? e : e.p).applyQuaternion(qBase).add(base.mPos).applyMatrix4(base.pMat); };
    let aim = null;
    if (move.pts) {
      const f = THREE.MathUtils.clamp(v('pan'), 0, move.pts.length - 1), i = Math.min(move.pts.length - 2, Math.floor(f));
      aim = world(move.pts[i]).clone().lerp(world(move.pts[i + 1]), f - i);
    } else if (move.at || k.focus) aim = world(move.at || 'array').clone();
    target.copy(base.target);
    if (aim) target.lerp(aim, move.view && !k.focus ? 1 : v('focus', move.pts ? 1 : 0));
    // View set-ups are authored for the 26° studio lens; composition views use
    // a long lens that would crop them several times tighter.
    const fov = move.view ? 26 : base.fov;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (move.view) {
      offset.fromArray(move.view).normalize();
      // Views are authored for the 18 Pro. When a Duo part faces the other way
      // in the current pose, mirror the view across that part's surface.
      const n = entry(move.at || move.pts?.[0] || 'array').n;
      if (n) { const d = offset.dot(n); if (d < 0) offset.addScaledVector(n, -2 * d); }
      offset.applyQuaternion(qBase).applyQuaternion(base.pQuat).multiplyScalar((move.dist || 3) * (move.device ? 1 : base.scale) * base.pScale);
    }
    else offset.copy(base.pos).sub(base.target);
    sph.setFromVector3(offset);
    sph.theta += v('orbit') * tau * base.orbitSign;
    sph.phi = THREE.MathUtils.clamp(sph.phi - v('rise'), 0.04, Math.PI - 0.04);
    sph.radius *= v('dolly', 1);
    offset.setFromSpherical(sph);
    control.target.copy(target);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
    stage.scene.environmentRotation.y = base.env + v('glint');
    stage.mark();
  }

  function reset() {
    if (!base) return;
    const model = base.model;
    model.position.copy(base.mPos);
    model.quaternion.copy(base.mQuat);
    if (camera.fov !== base.fov) { camera.fov = base.fov; camera.updateProjectionMatrix(); }
    if (!base.cameraFree) {
      camera.position.copy(base.pos);
      control.target.copy(base.target);
    }
    if (stage.progress !== base.progress) stage.setProgress(base.progress);
    if (base.duoFor) resetDuoChannels(stage);
    stage.scene.environmentRotation.y = base.env;
    control.update();
    base = null;
    stage.mark();
  }

  // The viewer took the camera: keep their framing when the move is cleared.
  function release() { if (base) base.cameraFree = true; }

  return { begin, apply, reset, release, get active() { return !!base; } };
}

