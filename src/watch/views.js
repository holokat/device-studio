// Studio views for the Apple Watch (46 mm aluminium). Same table shape as
// src/pixel/views.js: `rot` is the device orientation as an Euler [x, y, z]
// applied to the model; `dir` is the world camera direction; `at` names an
// anchor from src/watch/model.js (otherwise the view frames the visible
// bounds); `fov` overrides the 26° default; `progress` sets the assembly
// separation; `pose` goes to setPose: { band: 'loop' } (worn, the default) or
// { band: 'open' } (straps laid out straight, needed wherever the back shows).
// Model frame: display faces -Z, 12 o'clock +Y, crown on -X (viewer's right
// from the front). Units are cm; the case is 3.9 × 4.6, the worn loop about
// 7.3 tall and 4.5 deep.
const P = [0, 0, 0];
const OPEN = { band: 'open' };
export const watchShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Front three-quarter, worn band', rot: [.12, 0, 0], dir: [-.62, .32, -1], height: 9.6, minWidth: 9.6 },
  front: { shelf: 'compositions', title: 'Display', label: 'Straight-on front', rot: P, dir: [0, 0, -1], height: 6.4, minWidth: 6.4, fov: 14, pose: OPEN },
  'watch-back': { shelf: 'compositions', title: 'Back', label: 'Sensor crystal and back cover', rot: P, dir: [0, 0, 1], height: 6.4, minWidth: 6.4, fov: 14, pose: OPEN },
  'watch-profile': { shelf: 'compositions', title: 'Side profile', label: 'Crown side, domed glass and back', rot: P, dir: [-1, 0, 0], height: 3.0, minWidth: 6.6, fov: 10, pose: OPEN },
  'watch-float': { shelf: 'compositions', title: 'Floating', label: 'Tilted float with the band loop', rot: [.5, -.55, .35], dir: [.1, .1, -1], height: 9.8, minWidth: 10 },
  'watch-exploded': { shelf: 'compositions', title: 'Exploded', label: 'Display, internals, case, back and band apart', rot: P, at: 'center', dir: [-1, .32, -.5], height: 13, minWidth: 15, progress: 1, pose: OPEN },
  'watch-crown': { shelf: 'details', title: 'Digital Crown', label: 'Crown and side button', rot: P, at: 'buttons', dir: [-1, .22, -.5], height: 2.9, minWidth: 3.6, fov: 20, pose: OPEN },
  'watch-crown-macro': { shelf: 'details', title: 'Crown macro', label: 'Knurled Digital Crown', rot: P, at: 'crown', dir: [-1, .12, -.62], height: 1.25, minWidth: 1.7, fov: 18, pose: OPEN },
  'watch-sensor': { shelf: 'details', title: 'Sensor', label: 'Sensor crystal close-up', rot: P, at: 'sensor', dir: [.3, .25, 1], height: 3.4, minWidth: 3.9, fov: 20, pose: OPEN },
  'watch-edge': { shelf: 'details', title: 'Glass edge', label: 'Glass rolling into the case', rot: P, at: 'slotBottom', dir: [0, -.55, -1], height: 2.6, minWidth: 4.6, fov: 18 },
};
export const watchParts = { display: 'Display and cover glass', internals: 'Battery, SiP and Taptic Engine', case: 'Aluminium case', crown: 'Digital Crown and side button', back: 'Back cover', sensor: 'Sensor crystal', bands: 'Sport band' };
