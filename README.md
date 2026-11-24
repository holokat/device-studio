# Device Studio

A browser studio for product shots and launch-style films of devices. Every model is built in code with [three.js](https://threejs.org). There are no imported meshes.

Drop your own design onto the screen, pick a finish, light it and frame it, then export a PNG, a WebM clip or a GLB.

## Devices

iPhone 18 Pro · iPhone Duo (foldable) · iPhone 17 · iPhone Air · Pixel 11 Pro · iPad · MacBook Pro · Studio Display XDR · iMac 24-inch

## Features

- **Your screen:** use an image, a video or an HTML page, which is rendered live and fitted to the display. Add an **SVG layer** on top: solid shapes stay sharp as real geometry.
- **Finishes:** each device's own colours, or any custom colour.
- **Light and backdrop:** softbox, rim or daylight, on a dark, light or transparent backdrop.
- **Moves:** 40+ cinematic camera moves, including spins, macros, screen pans and combos, with a scrubbable timeline and an editable timing curve.
- **Views:** compositions and hardware close-ups, with live thumbnails.
- **Assembly:** explode any device into its parts, or open and close the Duo and the MacBook.
- **Export:** PNG stills up to 3840 px, 30 fps WebM clips (WebCodecs), and GLB models with an editable screen material and a baked animation.

## Run it

```bash
npm install
npm run build
npm run preview
```

Then open http://127.0.0.1:48372. The built `studio.js` is committed, so `npm run preview` (or any static server) works without building.

URL parameters: `?device=imac`, `?shot=hero`, `?finish=orange`.

## Layout

- `src/app.js`: the UI. `src/stage.js`: the renderer, lighting and shots. `src/devices.js`: the device registry.
- `src/<device>/`: each model (`model.js`) and its views (`views.js`).
- `src/cinematic.js`: the camera moves, as keyframe channels.
- `src/html-screen.js`, `src/svg-layer.js`: HTML screens and the SVG layer.
- `screens/`: the presentation wallpapers and the HTML editor screen (`tools/make_editor.py` generates it).

## License

The code is under the [MIT](LICENSE) license; three.js is under its own MIT license ([THREE-LICENSE.txt](THREE-LICENSE.txt)).

The device models are original, made from public product imagery. Device names and logos are trademarks of their owners. This project is not affiliated with or endorsed by Apple or Google.
