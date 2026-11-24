// Studio views for the Pixel 11 Pro. Same table shape as src/air/views.js:
// `rot` is the device orientation as an Euler [x, y, z] applied to the model;
// `dir` is the world camera direction; `at` names an anchor from
// src/pixel/model.js (otherwise the view frames the device bounds); `fov`
// overrides the 26° default; `progress` sets the assembly separation.
const P = [0, 0, 0];
// Lying on its face, top to the left, power/volume edge (-X) toward the
// camera: Google's flat side-profile composition with the bar on top.
const LYING = [-Math.PI / 2, 0, Math.PI / 2];
// Bottom edge with the back facing up.
const BACK_UP = [-Math.PI / 2, 0, 0];
export const pixelShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Rear three-quarter', rot: P, dir: [-.8, .14, 1], height: 19.6, minWidth: 12 },
  front: { shelf: 'compositions', title: 'Display', label: 'Front three-quarter', rot: P, dir: [.36, .1, -1], height: 20.2, minWidth: 11 },
  'pixel-back': { shelf: 'compositions', title: 'Back', label: 'Straight-on back', rot: P, dir: [0, 0, 1], height: 18.4, minWidth: 10, fov: 14 },
  'pixel-profile': { shelf: 'compositions', title: 'Side profile', label: 'Flat profile with the camera bar', rot: LYING, dir: [0, .02, 1], height: 3.4, minWidth: 17.6, fov: 8 },
  'pixel-edge': { shelf: 'compositions', title: 'Edge', label: 'Edge-on three-quarter', rot: [0, 0, -.06], dir: [-1, .14, .26], height: 17.6, minWidth: 8, fov: 16 },
  'pixel-float': { shelf: 'compositions', title: 'Floating back', label: 'Tilted rear float', rot: [.3, .38, -.2], dir: [.16, .12, 1], height: 19, minWidth: 12 },
  'pixel-bar': { shelf: 'details', title: 'Camera bar', label: 'Camera bar macro', rot: P, at: 'array', dir: [-.38, .3, 1], height: 4.6, minWidth: 9.2 },
  'pixel-lens': { shelf: 'details', title: 'Wide camera', label: '50MP wide camera', rot: P, at: 'main', dir: [-.2, .16, 1], height: 2.6, minWidth: 3.4 },
  'pixel-bar-edge': { shelf: 'details', title: 'Bar surround', label: 'Polished bar surround at a grazing angle', rot: P, at: 'array', dir: [-.7, -.55, .5], height: 3.6, minWidth: 8.4, fov: 20 },
  'pixel-exploded': { shelf: 'details', title: 'Bar exploded', label: 'Camera bar exploded', rot: P, at: 'array', progress: .55, dir: [-.75, .55, .75], height: 7.6, minWidth: 10.5, fov: 22 },
  'pixel-buttons': { shelf: 'details', title: 'Buttons', label: 'Power button and volume rocker', rot: P, at: 'buttons', dir: [-1, .16, -.42], height: 4.2, minWidth: 7.4, fov: 18 },
  'pixel-bottom': { shelf: 'details', title: 'Bottom edge', label: 'USB-C, speaker and SIM tray', rot: BACK_UP, at: 'usb', dir: [0, .025, 1], height: 2.6, minWidth: 8.4, fov: 14 },
  'pixel-hole': { shelf: 'details', title: 'Front camera', label: 'Hole-punch selfie camera', rot: P, at: 'island', dir: [0, .01, -1], height: 1.67, minWidth: 5.05 },
};
export const pixelParts = { display: 'Display stack', frame: 'Metal frame', back: 'Back glass and camera bar', cameras: 'Rear cameras', chamber: 'Vapour chamber', board: 'Logic board and modules', battery: 'Battery and flex' };
