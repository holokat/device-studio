// Studio views for the Studio Display XDR. Same table shape as src/ipad/views.js:
// `rot` is the model orientation as an Euler [x, y, z] (always upright here);
// `dir` is the world camera direction from the target; `at` names an anchor from
// src/studiodisplay/model.js (otherwise the view frames the visible bounds);
// `height`/`minWidth` are the framed extents in cm. Display-specific fields:
//   pose      { height: 0..1, tilt: degrees } → setHeight / setTilt (default { height: .5, tilt: 0 })
//   progress  assembly separation for setProgress (default 0)
// The model stands on y = 0 with the screen facing −Z.
const U = [0, 0, 0];
export const sdxShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Front three-quarter', rot: U, dir: [-.62, .16, -1], height: 68, minWidth: 84 },
  front: { shelf: 'compositions', title: 'Display', label: 'Display · front', rot: U, dir: [0, .03, -1], height: 58, minWidth: 70 },
  'sdx-back': { shelf: 'compositions', title: 'Back', label: 'Back · logo and mount plate', rot: U, dir: [.32, .1, 1], height: 58, minWidth: 72 },
  'sdx-profile': { shelf: 'compositions', title: 'Side profile', label: 'Side · arm and stand', rot: U, dir: [1, 0, 0], height: 64, minWidth: 30, fov: 12 },
  'sdx-tilt': { shelf: 'compositions', title: 'Tilt and height', label: 'Raised and tilted back', rot: U, dir: [1, .12, -.45], height: 66, minWidth: 40, pose: { height: 1, tilt: 18 } },
  'sdx-layers': { shelf: 'compositions', title: 'Display layers', label: 'Mini-LED stack · exploded', rot: U, dir: [.75, .3, -1], height: 56, minWidth: 80, progress: 1 },
  'sdx-corner': { shelf: 'details', title: 'Mini-LED corner', label: 'Top corner · mini-LED backlight', rot: U, at: 'corner', dir: [.62, .42, -1], height: 13, minWidth: 16, progress: 1, fov: 22 },
  'sdx-grille': { shelf: 'details', title: 'Speaker grille', label: 'Top edge · perforated grille', rot: U, at: 'speakers', dir: [.2, 1, -.55], height: 3.2, minWidth: 8, fov: 20 },
  'sdx-logo': { shelf: 'details', title: 'Back detail', label: 'Logo and VESA plate', rot: U, at: 'logo', dir: [.18, .08, 1], height: 26, minWidth: 22 },
  'sdx-ports': { shelf: 'details', title: 'Ports', label: 'Thunderbolt 5 and USB-C', rot: U, at: 'ports', dir: [.08, .06, 1], height: 4.6, minWidth: 9, fov: 20 },
  'sdx-cable': { shelf: 'details', title: 'Cable pass-through', label: 'Stand cable hole', rot: U, at: 'cable', dir: [0, .04, 1], height: 28, minWidth: 22, fov: 12 },
  'sdx-arm': { shelf: 'details', title: 'Arm', label: 'Counterbalanced arm · pivot caps', rot: U, at: 'arm', dir: [1, .12, .2], height: 8, minWidth: 14, fov: 20 },
  'sdx-foot': { shelf: 'details', title: 'Stand foot', label: 'Foot, fillet and plinth', rot: U, at: 'stand', dir: [-.75, .4, -1], height: 13, minWidth: 22 },
  'sdx-camera': { shelf: 'details', title: 'Camera', label: '12MP Center Stage camera', rot: U, at: 'camera', dir: [0, .05, -1], height: 2.4, minWidth: 4.2, fov: 20 },
};
export const sdxParts = { display: 'Aluminium enclosure', layers: 'Display stack and mini-LED backlight', ports: 'Thunderbolt 5 and USB-C ports', arm: 'Counterbalanced arm', stand: 'Stand' };
