# Peg & Pixel

An iPad-friendly bead board reference app built with React, TypeScript, and Vite. Images are processed entirely in your browser; they are never uploaded to a server.

## Use it

1. Open the GitHub Pages URL in Safari on your iPad. You can also use **Share → Add to Home Screen**.
2. Upload a pixel image. The image fits inside the selected board without stretching; transparent pixels remain empty. For exact pixel-to-bead mapping, use a 29 × 29 image with the default board. Larger images are sampled down with nearest-neighbor scaling.
3. Select your board and peg spacing (default: 29 × 29, 5 mm center to center).
4. Choose **Calibrate screen**, then use a ruler to adjust the reference line to exactly 50 mm. Calibration is saved on this browser. Recalibrate after changing browser zoom or moving to another device.
5. Choose **Start beading** and place your transparent board on the screen. Adjust the physical board until the pegs match the grid dots. Pattern movement and settings are locked; hold the unlock button for one second to exit.

Beading mode requests a screen wake lock when supported. Otherwise adjust Auto-Lock in your iPad settings. It cannot prevent system gestures. A board larger than the screen remains at physical size and will be clipped; only the visible area can be used at once. Rotation is around the center of the selected square board. GIFs use a static frame.

## Development

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

```sh
npm run build
npm run preview
```

## GitHub Pages

The included GitHub Actions workflow builds and deploys `dist` on pushes to `main`. In repository **Settings → Pages**, set the source to **GitHub Actions**. Vite uses a relative asset base, so the app works under a GitHub Pages repository path.

No API keys or backend are required. The only external runtime request is for optional Google Fonts; the UI falls back to system sans-serif fonts.
