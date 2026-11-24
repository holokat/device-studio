// Studio views for the MacBook Pro 14-inch. `fold` is the lid progress (0
// closed, 1 open at 110°); `rot` is the device orientation as an Euler
// [x, y, z] (the base lies flat, display toward -Z); `dir` is the world camera
// direction; `at` names an anchor from src/macbook/model.js (otherwise the
// view frames the device bounds); `height` / `minWidth` are the framed extent
// in cm; `fov` overrides the 26° lens for long-lens macro work.
// Open, the display normal is (0, sin 20°, -cos 20°), so `front` looks straight on.
const F = [0, 0, 0];
export const mbpShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Open · front three-quarter', fold: 1, rot: F, dir: [-.62, .42, -1], height: 34, minWidth: 52 },
  front: { shelf: 'compositions', title: 'Display', label: 'Open · straight on', fold: .87, rot: F, dir: [0, .012, -1], height: 22.6, minWidth: 34, fov: 13 },
  'mbp-closed': { shelf: 'compositions', title: 'Closed', label: 'Closed · front three-quarter', fold: 0, rot: F, dir: [-.75, .55, -1], height: 18, minWidth: 34 },
  'mbp-lid': { shelf: 'compositions', title: 'Lid', label: 'Closed · lid and logo', fold: 0, rot: F, at: 'logo', dir: [0, 1, .3], height: 24.5, minWidth: 33 },
  'mbp-side': { shelf: 'compositions', title: 'Half open profile', label: 'Half open · left side', fold: .25, rot: F, dir: [1, .012, -.015], height: 11, minWidth: 25, fov: 8 },
  'mbp-ports-left': { shelf: 'details', title: 'Left ports', label: 'MagSafe 3, Thunderbolt, headphone', fold: 0, rot: F, at: 'portsLeft', dir: [1, .035, .03], height: 2.6, minWidth: 8.6, fov: 18 },
  'mbp-ports-right': { shelf: 'details', title: 'Right ports', label: 'HDMI, Thunderbolt, SDXC', fold: 0, rot: F, at: 'portsRight', dir: [-1, .035, .03], height: 2.6, minWidth: 8.6, fov: 18 },
  'mbp-keyboard': { shelf: 'details', title: 'Keyboard', label: 'Keyboard, Touch ID and trackpad', fold: 1, rot: F, at: 'keyboardMacro', dir: [-.32, 1, -.62], height: 9.5, minWidth: 13 },
  'mbp-notch': { shelf: 'details', title: 'Camera notch', label: 'Notch and FaceTime camera', fold: 1, rot: F, at: 'notch', dir: [0, .364, -1], height: 2.4, minWidth: 5.6 },
  'mbp-lip': { shelf: 'details', title: 'Front lip', label: 'Closed · thumb scoop', fold: 0, rot: F, at: 'scoop', dir: [0, .03, -1], height: 2.4, minWidth: 11, fov: 18 },
};
export const mbpParts = { base: 'Aluminium base', lid: 'Display lid', display: 'Display', keyboard: 'Keyboard and trackpad', ports: 'Ports', cameras: 'FaceTime camera' };
