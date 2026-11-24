// Studio views for the iMac 24-inch (M4). Same table shape as src/ipad/views.js:
// `rot` is the model orientation as an Euler [x, y, z] (always upright here);
// `dir` is the world camera direction from the target; `at` names an anchor
// from src/imac/model.js (otherwise the view frames the visible bounds);
// `height`/`minWidth` are the framed extents in cm. iMac-specific fields:
//   pose      { tilt?: degrees, accessories?: bool } → setPose (default: 6° tilt, accessories hidden)
//   progress  assembly separation for setProgress (default 0)
// The model stands on y = 0 with the screen facing −Z, tilted 6° back, so the
// screen normal is (0, sin 6°, −cos 6°) = (0, .105, −.995).
const U = [0, 0, 0];
export const imacShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Front three-quarter', rot: U, dir: [-.55, .16, -1], height: 56, minWidth: 70 },
  front: { shelf: 'compositions', title: 'Display', label: 'Display · front', rot: U, dir: [0, .105, -1], height: 52, minWidth: 64, fov: 16 },
  'imac-profile': { shelf: 'compositions', title: 'Side profile', label: 'Side · 11.5 mm slab and stand', rot: U, dir: [1, 0, 0], height: 56, minWidth: 30, fov: 10 },
  'imac-back': { shelf: 'compositions', title: 'Back', label: 'Rear three-quarter · logo and stand', rot: U, dir: [.45, .16, 1], height: 56, minWidth: 70 },
  'imac-desk': { shelf: 'compositions', title: 'On the desk', label: 'With Magic Keyboard and Magic Mouse', rot: U, dir: [-.42, .5, -1], height: 64, minWidth: 90, pose: { accessories: true } },
  'imac-exploded': { shelf: 'compositions', title: 'Display layers', label: 'Front glass lifted', rot: U, dir: [.8, .25, -1], height: 70, minWidth: 104, progress: 1 },
  'imac-hinge': { shelf: 'details', title: 'Hinge', label: 'Hinge and polished cap', rot: U, at: 'hinge', dir: [1, .55, .6], height: 7, minWidth: 11, fov: 20 },
  'imac-ports': { shelf: 'details', title: 'Ports', label: 'Thunderbolt and USB-C', rot: U, at: 'ports', dir: [-.12, .08, 1], height: 4.5, minWidth: 9, fov: 20 },
  'imac-cable': { shelf: 'details', title: 'Stand cut-out', label: 'Riser and oval cut-out', rot: U, at: 'cable', dir: [.1, .12, 1], height: 13, minWidth: 14 },
  'imac-power': { shelf: 'details', title: 'Power button', label: 'Back · power button', rot: U, at: 'power', dir: [.2, .1, 1], height: 3.6, minWidth: 6, fov: 20 },
  'imac-jack': { shelf: 'details', title: 'Headphone jack', label: 'Left edge · headphone jack', rot: U, at: 'jack', dir: [1, .1, -.7], height: 3.2, minWidth: 6, fov: 18 },
  'imac-camera': { shelf: 'details', title: 'Camera', label: '12MP Center Stage camera', rot: U, at: 'camera', dir: [0, .105, -1], height: 2.4, minWidth: 4.2, fov: 20 },
  'imac-foot': { shelf: 'details', title: 'Stand foot', label: 'Foot plate and rear bend', rot: U, at: 'stand', dir: [-.75, .55, -1], height: 20, minWidth: 34 },
};
export const imacParts = { display: 'Front glass and Retina display', enclosure: 'Aluminium enclosure', internals: 'Logic board and speakers', ports: 'Ports, power button and headphone jack', stand: 'Stand and hinge', accessories: 'Magic Keyboard and Magic Mouse' };
