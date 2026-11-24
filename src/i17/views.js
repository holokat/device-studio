// Studio views for the iPhone 17. `rot` is the device orientation as an Euler
// [x, y, z] applied to the model (portrait upright = [0, 0, 0]); `dir` is the
// world camera direction; `at` names an anchor from src/i17/model.js (otherwise
// the view frames the device bounds). `fov` overrides the 26° default.
const P = [0, 0, 0];
// Bottom edge with the back facing up, as in Apple's USB-C photograph.
const BACK_UP = [-Math.PI / 2, 0, 0];
export const i17Shots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Rear three-quarter', rot: [0, 0, -.12], dir: [.5, .2, 1], height: 19.6, minWidth: 12 },
  front: { shelf: 'compositions', title: 'Display', label: 'Front three-quarter', rot: P, dir: [.42, .1, -1], height: 19.8, minWidth: 11 },
  'i17-back': { shelf: 'compositions', title: 'Back', label: 'Back, straight on', rot: P, dir: [0, 0, 1], height: 17.6, minWidth: 10 },
  'i17-corner': { shelf: 'compositions', title: 'Camera corner', label: 'Rear three-quarter of the camera corner', rot: P, at: 'array', dir: [-.95, .3, 1], height: 6, minWidth: 6.5 },
  'i17-camera': { shelf: 'details', title: 'Camera bump', label: 'Fusion camera bump macro', rot: P, at: 'array', dir: [-.1, .05, 1], height: 3.9, minWidth: 3.4, fov: 18 },
  'i17-lenses': { shelf: 'details', title: 'Lens rings', label: 'Lens rings at a grazing angle', rot: P, at: 'array', dir: [-.55, 1, .5], height: 2.8, minWidth: 5.2, fov: 20 },
  'i17-profile': { shelf: 'details', title: 'Side profile', label: 'Side button and Camera Control', rot: P, dir: [-1, 0, 0], height: 16.2, minWidth: 3.2, fov: 6 },
  'i17-bottom': { shelf: 'details', title: 'Bottom edge', label: 'USB-C and speakers', rot: BACK_UP, at: 'usb', dir: [0, .025, 1], height: 2.6, minWidth: 8.4, fov: 14 },
  'i17-control': { shelf: 'details', title: 'Camera Control', label: 'Sapphire Camera Control', rot: P, at: 'control', dir: [-1, .12, -.32], height: 3.2, minWidth: 4.4, fov: 18 },
  'i17-action': { shelf: 'details', title: 'Action button', label: 'Action button and volume', rot: P, at: 'action', dir: [1, .1, -.4], height: 4.4, minWidth: 5.2, fov: 18 },
  'i17-island': { shelf: 'details', title: 'Dynamic Island', label: 'Dynamic Island', rot: P, at: 'island', dir: [0, .01, -1], height: 1.6, minWidth: 4.6, fov: 18 },
};
export const i17Parts = { display: 'Display stack', frame: 'Aluminium frame', back: 'Back glass and bump', cameras: 'Fusion cameras', coil: 'MagSafe coil', battery: 'Battery', board: 'Logic board and modules' };
