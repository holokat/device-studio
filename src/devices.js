// Per-device data for the studio UI. The scene side lives in stage.setDevice().
import { deviceShots, deviceParts } from './stage.js';
import { devicePoints } from './cinematic.js';
import { duoFinishes, INNER_ASPECT } from './duo/model.js';
import { ipadFinishes, IPAD_ASPECT } from './ipad/model.js';
import { airFinishes, AIR_ASPECT } from './air/model.js';
import { wallpaperCanvas } from './wallpapers.js';
import { i17Finishes, I17_ASPECT } from './i17/model.js';
import { mbpFinishes, MBP_ASPECT } from './macbook/model.js';
import { sdxFinishes, SDX_ASPECT } from './studiodisplay/model.js';
import { pixelFinishes, PIXEL_ASPECT } from './pixel/model.js';
import { imacFinishes, IMAC_ASPECT } from './imac/model.js';

// Name of the finish with this hex (for wallpapers that come in one version per finish).
const finishName = (list, hex) => list.find((f) => f[1].toLowerCase() === String(hex).toLowerCase())?.[0] ?? null;
const swatch = (low, hex, high) => 'linear-gradient(132deg,' + low + ' 0%,' + hex + ' 35%,' + high + ' 69%,' + hex + ' 100%)';

export const devices = {
  pro: {
    id: 'pro', name: 'iPhone 18 Pro', file: 'iPhone-18-Pro',
    finishTitle: 'Titanium finish', finishCaption: 'Satin titanium', defaultFinish: 'Graphite',
    // [name, hex, swatch gradient]
    finishes: [
      ['Burgundy', '#67323d', swatch('#542530', '#67323d', '#ae7784')], ['Graphite', '#373739', swatch('#242528', '#373739', '#8b8b8c')],
      ['Pearl', '#d4d1c8', swatch('#9a9791', '#d4d1c8', '#f7f4ea')], ['Glacier', '#91aac8', swatch('#627790', '#91aac8', '#c3d4e9')],
      ['Copper', '#c97642', swatch('#a2582f', '#c97642', '#efb081')],
    ],
    shots: deviceShots.pro, parts: deviceParts.pro, points: devicePoints.pro,
    artwork: { width: 640, height: 1360, aspect: 7.05 / 14.85, label: 'iPhone 18 Pro', presentation: (W, H) => wallpaperCanvas('pro', W, H) },
    overlay: { style: 'phone' },
    assembly: {
      title: 'Assembly', from: 'Assembled', to: 'Exploded', toAction: 'Explode', fromAction: 'Assemble',
      toing: 'Exploding', froming: 'Assembling', clipTo: 'Disassemble', clipFrom: 'Reassemble', playTo: 'Play disassembly', playFrom: 'Play reassembly',
      slider: 'Assembly separation', partial: 'Assembly view',
    },
    fineprint: 'Internal placement is inferred from the supplied mockup references.',
  },
  duo: {
    id: 'duo', name: 'iPhone Duo', file: 'iPhone-Duo',
    finishTitle: 'Finish', finishCaption: 'Satin glass · polished frame', defaultFinish: 'Graphite',
    finishes: duoFinishes.map(([name, back, frame]) => [name, back, swatch(frame, back, back)]),
    shots: deviceShots.duo, parts: deviceParts.duo, points: 'live',
    artwork: { width: 1456, height: 1024, aspect: INNER_ASPECT, label: 'iPhone Duo', layout: 900, presentation: (W, H) => wallpaperCanvas('duo', W, H) },
    overlay: { style: 'tablet' },
    assembly: {
      title: 'Fold', from: 'Closed', to: 'Open', toAction: 'Open', fromAction: 'Close',
      toing: 'Opening', froming: 'Closing', clipTo: 'Unfold', clipFrom: 'Fold', playTo: 'Play unfold', playFrom: 'Play fold',
      slider: 'Fold angle', partial: 'Fold view',
    },
    // Fold progress shown as the opening angle.
    formatProgress: (p) => Math.round(180 * p) + '°',
    fineprint: 'Hinge mechanism and part layout are modelled from Apple product imagery.',
  },
  ipad: {
    id: 'ipad', name: 'iPad', file: 'iPad',
    finishTitle: 'Finish', finishCaption: 'Bead-blasted anodized aluminium', defaultFinish: 'Blue',
    finishes: ipadFinishes.map(([name, hex, , low, high]) => [name, hex, swatch(low, hex, high)]),
    shots: deviceShots.ipad, parts: deviceParts.ipad, points: 'live',
    // Landscape panel, 2360 × 1640 px, drawn at 0.8×. Presentation = the MacBook Pro loops wallpaper.
    artwork: { width: 1888, height: 1312, aspect: IPAD_ASPECT, label: 'iPad', layout: 1180, finishArt: true, presentation: (W, H, hex) => wallpaperCanvas('ipad', W, H, finishName(ipadFinishes, hex)) },
    overlay: { style: 'tablet' },
    assembly: {
      title: 'Assembly', from: 'Assembled', to: 'Exploded', toAction: 'Explode', fromAction: 'Assemble',
      toing: 'Exploding', froming: 'Assembling', clipTo: 'Disassemble', clipFrom: 'Reassemble', playTo: 'Play disassembly', playFrom: 'Play reassembly',
      slider: 'Assembly separation', partial: 'Assembly view',
    },
    fineprint: 'Exterior from Apple specifications and product imagery. The rear panel split and interior layout are illustrative.',
  },
  air: {
    id: 'air', name: 'iPhone Air', file: 'iPhone-Air',
    finishTitle: 'Finish', finishCaption: 'Titanium frame · glass back', defaultFinish: 'Sky Blue',
    finishes: airFinishes.map(([name, back, frame, plateau]) => [name, back, swatch(frame, back, plateau)]),
    shots: deviceShots.air, parts: deviceParts.air, points: 'live',
    // 2736 × 1260 px panel, drawn at half size.
    artwork: { width: 630, height: 1368, aspect: AIR_ASPECT, label: 'iPhone Air', presentation: (W, H) => wallpaperCanvas('air', W, H) },
    overlay: { style: 'phone' },
    assembly: {
      title: 'Assembly', from: 'Assembled', to: 'Exploded', toAction: 'Explode', fromAction: 'Assemble',
      toing: 'Exploding', froming: 'Assembling', clipTo: 'Disassemble', clipFrom: 'Reassemble', playTo: 'Play disassembly', playFrom: 'Play reassembly',
      slider: 'Assembly separation', partial: 'Assembly view',
    },
    fineprint: 'Exterior measured from Apple product photography. Interior layout is illustrative.',
  },
  i17: {
    id: 'i17', name: 'iPhone 17', file: 'iPhone-17',
    finishTitle: 'Finish', finishCaption: 'Aluminium frame · colour-infused glass', defaultFinish: 'Mist Blue',
    finishes: i17Finishes.map(([name, back, frame, bump]) => [name, back, swatch(frame, back, bump)]),
    shots: deviceShots.i17, parts: deviceParts.i17, points: 'live',
    // 2622 × 1206 px panel, drawn at half size.
    artwork: { width: 603, height: 1311, aspect: I17_ASPECT, label: 'iPhone 17', presentation: (W, H) => wallpaperCanvas('i17', W, H) },
    overlay: { style: 'phone' },
    assembly: {
      title: 'Assembly', from: 'Assembled', to: 'Exploded', toAction: 'Explode', fromAction: 'Assemble',
      toing: 'Exploding', froming: 'Assembling', clipTo: 'Disassemble', clipFrom: 'Reassemble', playTo: 'Play disassembly', playFrom: 'Play reassembly',
      slider: 'Assembly separation', partial: 'Assembly view',
    },
    fineprint: 'Exterior measured from Apple product photography. Interior layout is illustrative.',
  },
  pixel: {
    id: 'pixel', name: 'Pixel 11 Pro', file: 'Pixel-11-Pro',
    finishTitle: 'Finish', finishCaption: 'Metal frame · matte glass back', defaultFinish: 'Obsidian',
    finishes: pixelFinishes.map(([name, back, frame, ring]) => [name, back, swatch(frame, back, ring)]),
    shots: deviceShots.pixel, parts: deviceParts.pixel, points: 'live',
    // 1280 × 2856 px panel, drawn at half size.
    artwork: { width: 640, height: 1428, aspect: PIXEL_ASPECT, label: 'Pixel 11 Pro', finishArt: true, presentation: (W, H, hex) => wallpaperCanvas('pixel', W, H, finishName(pixelFinishes, hex)) },
    overlay: { style: 'phone' },
    assembly: {
      title: 'Assembly', from: 'Assembled', to: 'Exploded', toAction: 'Explode', fromAction: 'Assemble',
      toing: 'Exploding', froming: 'Assembling', clipTo: 'Disassemble', clipFrom: 'Reassemble', playTo: 'Play disassembly', playFrom: 'Play reassembly',
      slider: 'Assembly separation', partial: 'Assembly view',
    },
    fineprint: 'Exterior measured from Google product imagery. Interior layout is illustrative.',
  },
  mbp: {
    id: 'mbp', name: 'MacBook Pro', file: 'MacBook-Pro',
    finishTitle: 'Finish', finishCaption: 'Anodized aluminium', defaultFinish: 'Space Black',
    finishes: mbpFinishes.map(([name, hex]) => [name, hex, swatch(hex, hex, name === 'Silver' ? '#ffffff' : '#5a595c')]),
    shots: deviceShots.mbp, parts: deviceParts.mbp, points: 'live',
    // 3024 × 1964 Liquid Retina XDR panel (with the notch strip), drawn at half size.
    artwork: { width: 1512, height: 982, aspect: MBP_ASPECT, label: 'MacBook Pro', layout: 1512, finishArt: true, presentation: (W, H, hex) => wallpaperCanvas('mbp', W, H, finishName(mbpFinishes, hex)) },
    assembly: {
      title: 'Lid', from: 'Closed', to: 'Open', toAction: 'Open', fromAction: 'Close',
      toing: 'Opening', froming: 'Closing', clipTo: 'Open lid', clipFrom: 'Close lid', playTo: 'Play opening', playFrom: 'Play closing',
      slider: 'Lid angle', partial: 'Lid view',
    },
    formatProgress: (p) => Math.round(110 * p) + '°',
    fineprint: 'Exterior measured from Apple product imagery and photography.',
  },
  sdx: {
    id: 'sdx', name: 'Studio Display XDR', file: 'Studio-Display-XDR',
    finishTitle: 'Finish', finishCaption: 'Anodized aluminium', defaultFinish: 'Silver',
    finishes: sdxFinishes.map(([name, hex]) => [name, hex, swatch('#b9babd', hex, '#ffffff')]),
    shots: deviceShots.sdx, parts: deviceParts.sdx, points: 'live',
    // 5120 × 2880 panel, drawn at 5/16 size.
    // Presentation: the Spectrum folds wallpaper. The HTML editor (screens/editor/index.html) can be loaded with Replace.
    artwork: { width: 1600, height: 900, aspect: SDX_ASPECT, label: 'Studio Display XDR', layout: 1920, presentation: (W, H) => wallpaperCanvas('sdx', W, H), presentationLabel: ['Presentation', 'Spectrum folds'] },
    // Only the HTML editor and your own artwork; the wallpaper presets are hidden.
    presets: false,
    assembly: {
      title: 'Display stack', from: 'Assembled', to: 'Exploded', toAction: 'Explode', fromAction: 'Assemble',
      toing: 'Exploding', froming: 'Assembling', clipTo: 'Disassemble', clipFrom: 'Reassemble', playTo: 'Play disassembly', playFrom: 'Play reassembly',
      slider: 'Assembly separation', partial: 'Assembly view',
    },
    fineprint: 'Exterior measured from Apple product imagery. The mini-LED stack is illustrative.',
  },
  imac: {
    id: 'imac', name: 'iMac 24-inch', file: 'iMac-24',
    finishTitle: 'Finish', finishCaption: 'Anodized aluminium · pastel stand', defaultFinish: 'Blue',
    finishes: imacFinishes.map(([name, back, chin, stand]) => [name, back, swatch(stand, back, chin)]),
    shots: deviceShots.imac, parts: deviceParts.imac, points: 'live',
    // 4480 × 2520 panel, drawn at 1/4 size; laid out like a 2240 pt desktop.
    artwork: { width: 1120, height: 630, aspect: IMAC_ASPECT, label: 'iMac', layout: 2240, finishArt: true, presentation: (W, H, hex) => wallpaperCanvas('imac', W, H, finishName(imacFinishes, hex)), presentationLabel: ['Presentation', 'Ribbons wallpaper'] },
    presets: false,
    assembly: {
      title: 'Assembly', from: 'Assembled', to: 'Exploded', toAction: 'Explode', fromAction: 'Assemble',
      toing: 'Exploding', froming: 'Assembling', clipTo: 'Disassemble', clipFrom: 'Reassemble', playTo: 'Play disassembly', playFrom: 'Play reassembly',
      slider: 'Assembly separation', partial: 'Assembly view',
    },
    fineprint: 'Exterior from Apple specifications and product imagery. Interior layout is illustrative.',
  },
};
export const deviceFromQuery = (search = location.search) => { const id = new URLSearchParams(search).get('device'); return id in devices ? id : 'pro'; };
