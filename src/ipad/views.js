// Studio views for the iPad (A16). `rot` is the device orientation as an Euler
// [x, y, z] applied to the model (landscape = -90° about Z, front camera on
// top); `screen` is the artwork orientation on the display; `dir` is the world
// camera direction; `at` names an anchor from src/ipad/model.js (otherwise the
// view frames the device bounds); `lineup` shows the fanned colour line-up.
const L = [0, 0, -Math.PI / 2], P = [0, 0, 0];
export const ipadShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Landscape · front three-quarter', rot: L, dir: [-.52, .2, -1], height: 25, minWidth: 35 },
  front: { shelf: 'compositions', title: 'Display landscape', label: 'Display · landscape', rot: L, dir: [.08, .04, -1], height: 21.6, minWidth: 29.5 },
  'ipad-portrait': { shelf: 'compositions', title: 'Display portrait', label: 'Display · portrait', rot: P, screen: 'portrait', dir: [.16, .06, -1], height: 28.6, minWidth: 22 },
  'ipad-fan': { shelf: 'compositions', title: 'Fanned colours', label: 'Colour line-up', rot: P, screen: 'portrait', lineup: true, dir: [-.12, .08, 1], height: 40, minWidth: 40 },
  'ipad-back': { shelf: 'compositions', title: 'Back', label: 'Rear three-quarter', rot: P, screen: 'portrait', dir: [.45, .16, 1], height: 29.5, minWidth: 22 },
  'ipad-camera': { shelf: 'details', title: 'Camera detail', label: '12MP Wide camera', rot: P, screen: 'portrait', at: 'array', dir: [-.3, .22, 1], height: 4.4, minWidth: 6.2 },
  'ipad-edge': { shelf: 'details', title: 'Edge profile', label: 'Volume buttons and edge', rot: L, at: 'volume', dir: [.25, .55, -1], height: 4.6, minWidth: 8.6, fov: 18 },
  'ipad-top': { shelf: 'details', title: 'Top button', label: 'Top button with Touch ID', rot: P, screen: 'portrait', at: 'topButton', dir: [.22, .9, -.55], height: 3.6, minWidth: 7.2 },
  'ipad-bottom': { shelf: 'details', title: 'Bottom edge', label: 'USB-C and speakers', rot: P, screen: 'portrait', at: 'usb', dir: [.05, -1, -.32], height: 2.8, minWidth: 9.4 },
};
export const ipadParts = { display: 'Display stack', frame: 'Aluminium enclosure', back: 'Rear panel', cameras: 'Rear camera', battery: 'Battery cells', board: 'Logic board and speakers' };
