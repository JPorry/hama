# Peg & Pixel

An iPad-friendly bead board reference app built with React, TypeScript, and Vite. Images are processed entirely in your browser; they are never uploaded to a server.

## Use it

1. Open the GitHub Pages URL in Safari on your iPad. You can also use **Share → Add to Home Screen**.
2. Upload a pixel image. Printed charts with a regular square grid are detected automatically. Cell colors are sampled inside each square, excluding grid lines and footer legends, and mapped one cell per bead. Charts larger than the board are cropped with a warning; select a larger board to see the entire chart. For images without a detected chart grid, the whole image fits inside the selected board without stretching using nearest-neighbor scaling; transparent pixels remain empty. Use **Plain pixel image** to override automatic chart detection. Detection works best with straight, dark grid lines and does not correct perspective in photographs.
3. Select your board and peg spacing (default: 29 × 29, 5 mm center to center).
4. Choose **Calibrate screen** and place your transparent board over the calibration grid. Align the top-left peg with the coral dot, then adjust the spacing until the dots match peg centers across rows and columns. Use the +/− buttons for fine adjustments. If the entire board does not fit, align as many visible pegs as possible. Save when the pegs line up. Calibration is saved on this browser. Recalibrate after changing browser zoom or moving to another device.
5. Choose **Start beading** and place your transparent board on the screen. Adjust the physical board until the pegs match the grid dots. Pattern movement and settings are locked; hold the unlock button for one second to exit.

Beading mode requests a screen wake lock when supported. Otherwise adjust Auto-Lock in your iPad settings. It cannot prevent system gestures. A board larger than the screen remains at physical size and will be clipped; only the visible area can be used at once. Rotation is around the center of the selected square board. GIFs use a static frame.

## Development

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## GitHub Pages

The included GitHub Actions workflow builds and deploys `dist` on pushes to `main`. In repository **Settings → Pages**, set the source to **GitHub Actions**. Vite uses a relative asset base, so the app works under a GitHub Pages repository path.

No API keys or backend are required. The only external runtime request is for optional Google Fonts; the UI falls back to system sans-serif fonts.

The import regression suite includes a generated JPEG chart and an optional local-image check. To run the Stitch regression, set `HAMA_TEST_IMAGE` to the original JPEG path before running `npm test`. User-uploaded images are not included in this repository.
