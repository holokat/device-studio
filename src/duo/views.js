// Studio views for the iPhone Duo. `fold` is the fold progress (0 closed,
// 1 flat open); `dir` is the world camera direction; `at` names an anchor in
// src/duo/model.js (otherwise the shot frames the device bounds); `orient`
// stands the device up as a tent or a laptop-style L for the current fold.
export const duoShots = {
  hero: { shelf: 'compositions', title: 'Free orbit', label: 'Closed · rear three-quarter', fold: 0, dir: [.62, .22, 1], height: 16.8, minWidth: 12 },
  front: { shelf: 'compositions', title: 'Display', label: 'Inner display, flat open', fold: 1, dir: [.3, .1, -1], height: 13.6, minWidth: 20.5 },
  'duo-outer': { shelf: 'compositions', title: 'Outer display', label: 'Closed · outer display', fold: 0, dir: [.36, .08, -1], height: 14.6, minWidth: 11 },
  'duo-tent': { shelf: 'compositions', title: 'Tent', label: 'Tent stand', fold: .39, orient: 'tent', dir: [-.62, .2, 1], height: 13.5, minWidth: 18 },
  'duo-laptop': { shelf: 'compositions', title: 'Half open L', label: 'Half open · 90°', fold: .5, orient: 'laptop', dir: [.5, .45, -1], height: 15, minWidth: 18 },
  'duo-flat': { shelf: 'compositions', title: 'Flat open', label: 'Flat open · outer faces', fold: 1, dir: [-.28, .16, 1], height: 13.6, minWidth: 20.5 },
  'duo-hinge': { shelf: 'details', title: 'Hinge detail', label: 'Hinge spine', fold: .1, at: 'hingeTop', dir: [1, .3, .55], height: 8.4, minWidth: 6 },
  'duo-camera': { shelf: 'details', title: 'Camera pair', label: 'Fusion camera pair', fold: 0, at: 'array', dir: [1.05, .7, .82], height: 4.6, minWidth: 7.6 },
  'duo-bottom': { shelf: 'details', title: 'Bottom edge', label: 'USB-C and speakers', fold: 0, at: 'usb', dir: [.08, -1, -.32], height: 3, minWidth: 9.6 },
};
export const duoParts = { display: 'Inner display', outer: 'Outer display', frame: 'Frame and hinge', back: 'Back glass', cameras: 'Camera optics' };
