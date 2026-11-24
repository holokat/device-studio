// Studio views for the iPad mini (A17 Pro). Same table shape as src/ipad/views.js:
// `rot` is the device orientation as an Euler [x, y, z] applied to the model
// (landscape = -90° about Z, front camera on top); `screen` is the artwork
// orientation on the display; `dir` is the world camera direction; `at` names
// an anchor from src/ipadmini/model.js (otherwise the view frames the device
// bounds); `lineup` shows the fanned colour line-up; `fov` overrides the 26°
// default (long lenses flatten the profile views).
const L = [0, 0, -Math.PI / 2], P = [0, 0, 0];
// Lying flat, back up, top to the left, -X edge (volume buttons, Pencil
// connector) toward the camera: the press profile composition.
const LYING = [-Math.PI / 2, 0, Math.PI / 2];
export const ipadMiniShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Landscape · front three-quarter', rot: L, dir: [-.52, .2, -1], height: 20, minWidth: 28 },
  front: { shelf: 'compositions', title: 'Display landscape', label: 'Display · landscape', rot: L, dir: [.08, .04, -1], height: 17.2, minWidth: 23.5 },
  'mini-portrait': { shelf: 'compositions', title: 'Display portrait', label: 'Display · portrait', rot: P, screen: 'portrait', dir: [.16, .06, -1], height: 22.6, minWidth: 17.4 },
  'mini-fan': { shelf: 'compositions', title: 'Fanned colours', label: 'Colour line-up', rot: P, screen: 'portrait', lineup: true, dir: [-.12, .08, 1], height: 34, minWidth: 33 },
  'mini-back': { shelf: 'compositions', title: 'Back', label: 'Rear three-quarter', rot: P, screen: 'portrait', dir: [.45, .16, 1], height: 23.4, minWidth: 17.4 },
  'mini-profile': { shelf: 'compositions', title: 'Side profile', label: '6.3 mm profile', rot: LYING, dir: [0, .02, 1], height: 3.2, minWidth: 22, fov: 8 },
  'mini-camera': { shelf: 'details', title: 'Camera detail', label: '12MP Wide camera and flash', rot: P, screen: 'portrait', at: 'array', dir: [-.3, .22, 1], height: 3.4, minWidth: 5.6 },
  'mini-edge': { shelf: 'details', title: 'Edge profile', label: 'Volume buttons and edge', rot: L, at: 'volume', dir: [.25, .55, -1], height: 3.8, minWidth: 7.2, fov: 18 },
  'mini-pencil': { shelf: 'details', title: 'Pencil connector', label: 'Apple Pencil magnetic connector', rot: P, screen: 'portrait', at: 'connector', dir: [-1, .12, -.32], height: 3.2, minWidth: 11.5, fov: 18 },
  'mini-top': { shelf: 'details', title: 'Top button', label: 'Top button with Touch ID', rot: P, screen: 'portrait', at: 'topButton', dir: [.22, .9, -.55], height: 3.0, minWidth: 6.4 },
  'mini-bottom': { shelf: 'details', title: 'Bottom edge', label: 'USB-C and speakers', rot: P, screen: 'portrait', at: 'usb', dir: [.05, -1, -.32], height: 2.4, minWidth: 7.6 },
};
export const ipadMiniParts = { display: 'Display stack', frame: 'Aluminium enclosure', back: 'Rear panel', cameras: 'Rear camera', battery: 'Battery cells', board: 'Logic board and speakers' };
