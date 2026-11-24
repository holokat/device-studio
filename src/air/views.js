// Studio views for the iPhone Air. Same table shape as src/ipad/views.js:
// `rot` is the device orientation as an Euler [x, y, z] applied to the model;
// `dir` is the world camera direction; `at` names an anchor from
// src/air/model.js (otherwise the view frames the device bounds); `fov`
// overrides the 26° default (long lenses flatten the profile views).
const P = [0, 0, 0];
// Lying on its face with the top to the left, back up, -X edge (side button,
// Camera Control) toward the camera: Apple's press profile composition.
const LYING = [-Math.PI / 2, 0, Math.PI / 2];
export const airShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Rear three-quarter', rot: P, dir: [-.5, .22, 1], height: 19.9, minWidth: 12 },
  front: { shelf: 'compositions', title: 'Display', label: 'Front three-quarter', rot: P, dir: [.33, .1, -1], height: 20.6, minWidth: 11 },
  'air-back': { shelf: 'compositions', title: 'Back', label: 'Straight-on back', rot: P, dir: [0, 0, 1], height: 18.4, minWidth: 10, fov: 14 },
  'air-profile': { shelf: 'compositions', title: 'Side profile', label: '5.64 mm profile', rot: LYING, dir: [0, .02, 1], height: 3.2, minWidth: 17.6, fov: 8 },
  'air-plateau': { shelf: 'details', title: 'Camera plateau', label: 'Plateau macro', rot: P, at: 'array', dir: [-.32, .34, 1], height: 4.6, minWidth: 8.6 },
  'air-lens': { shelf: 'details', title: 'Camera detail', label: '48MP Fusion camera', rot: P, at: 'main', dir: [-.22, .18, 1], height: 2.6, minWidth: 3.4 },
  'air-control': { shelf: 'details', title: 'Camera Control', label: 'Camera Control and side button', rot: P, at: 'control', dir: [-1, .32, .35], height: 3.4, minWidth: 7.4, fov: 18 },
  'air-buttons': { shelf: 'details', title: 'Action and volume', label: 'Action button and volume', rot: P, at: 'volume', dir: [1, .1, -.3], height: 3.2, minWidth: 7, fov: 18 },
  'air-edge': { shelf: 'compositions', title: 'Thin edge', label: 'Edge-on three-quarter', rot: [0, 0, -.08], dir: [-1, .14, .2], height: 17.5, minWidth: 8, fov: 16 },
  'air-float': { shelf: 'compositions', title: 'Floating back', label: 'Tilted rear float', rot: [.32, -.42, .22], dir: [-.18, .12, 1], height: 19, minWidth: 12 },
  'air-island': { shelf: 'details', title: 'Front sensor', label: 'Dynamic Island', rot: P, at: 'island', dir: [0, .009, -1], height: 1.67, minWidth: 5.05 },
  'air-bottom': { shelf: 'details', title: 'Bottom edge', label: 'USB-C', rot: P, at: 'usb', dir: [.05, -1, -.3], height: 2.2, minWidth: 6.4 },
};
export const airParts = { display: 'Display stack', frame: 'Titanium frame', back: 'Back glass and plateau', cameras: 'Fusion camera', battery: 'Battery', board: 'Logic board' };
