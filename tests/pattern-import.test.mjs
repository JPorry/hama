import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { detectChartGrid, sampleChart } from "../src/pattern-import.ts";

const palette = [
  [255, 255, 255],
  [33, 32, 30],
  [46, 78, 139],
  [42, 141, 194],
  [239, 116, 179],
];
function chartFixture() {
  const cols = 29,
    rows = 28,
    step = 16,
    width = cols * step + 1,
    height = rows * step + 65;
  const data = Buffer.alloc(width * height * 4, 255);
  const expected = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      expected.push(palette[(x * 7 + y * 3) % palette.length]);
  for (let y = 0; y <= rows * step; y++)
    for (let x = 0; x < width; x++) {
      const color =
        x % step === 0 || y % step === 0
          ? [30, 30, 30]
          : expected[
              Math.min(rows - 1, Math.floor(y / step)) * cols +
                Math.min(cols - 1, Math.floor(x / step))
            ];
      data.set([...color, 255], (y * width + x) * 4);
    }
  // Footer swatches must not become beads.
  for (let y = height - 20; y < height; y++)
    for (let x = 0; x < 100; x++)
      data.set([...palette[Math.floor(x / 20)], 255], (y * width + x) * 4);
  return { width, height, data, expected };
}

test("JPEG chart: recovers every cell, excludes grid lines and palette footer", async () => {
  const fixture = chartFixture();
  const jpg = await sharp(fixture.data, {
    raw: { width: fixture.width, height: fixture.height, channels: 4 },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
  const { data, info } = await sharp(jpg)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const image = { ...info, data };
  const grid = detectChartGrid(image);
  assert.ok(grid);
  assert.equal(grid.x.length - 1, 29);
  assert.equal(grid.y.length - 1, 28);
  const colors = sampleChart(image, grid, 29, 29);
  fixture.expected.forEach((expected, i) => {
    const actual = colors[i].match(/\d+/g).map(Number);
    expected.forEach((n, c) =>
      assert.ok(
        Math.abs(actual[c] - n) < 12,
        `cell ${i}, channel ${c}: ${actual[c]} vs ${n}`,
      ),
    );
  });
  assert.ok(colors.slice(29 * 28).every((c) => c === ""));
});

test("plain pixel images and flat images are not treated as charts", () => {
  assert.equal(
    detectChartGrid({
      width: 29,
      height: 29,
      data: Buffer.alloc(29 * 29 * 4, 255),
    }),
    null,
  );
  assert.equal(
    detectChartGrid({
      width: 500,
      height: 500,
      data: Buffer.alloc(500 * 500 * 4, 255),
    }),
    null,
  );
});

test("oversized chart is cropped at one cell per bead, never resampled", () => {
  const image = chartFixture();
  const grid = detectChartGrid(image);
  assert.ok(grid);
  const colors = sampleChart(image, grid, 14, 14);
  assert.equal(colors.length, 196);
  assert.equal(colors[0], `rgb(${image.expected[7 * 29 + 8].join(", ")})`);
});

test(
  "supplied Stitch JPEG regression",
  { skip: !process.env.HAMA_TEST_IMAGE },
  async () => {
    const { data, info } = await sharp(process.env.HAMA_TEST_IMAGE)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const image = { ...info, data },
      grid = detectChartGrid(image);
    assert.ok(grid);
    assert.equal(grid.x.length - 1, 29);
    assert.equal(grid.y.length - 1, 28);
    const colors = sampleChart(image, grid, 29, 29);
    // Independent known cell centers from the original chart; check all cells.
    for (let y = 0; y < 28; y++)
      for (let x = 0; x < 29; x++) {
        const px = Math.round(((x + 0.5) * 1200) / 29),
          py = Math.round((y + 0.5) * 41.36 - 5.5);
        const i = (py * info.width + px) * 4;
        const actual = colors[y * 29 + x].match(/\d+/g).map(Number);
        actual.forEach((value, c) =>
          assert.ok(
            Math.abs(value - data[i + c]) < 15,
            `Stitch cell ${x},${y}`,
          ),
        );
      }
    assert.ok(colors.slice(28 * 29).every((c) => c === ""));
  },
);
