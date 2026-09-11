export type Pixels = {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
};
export type ChartGrid = { x: number[]; y: number[] };

function axisLines(image: Pixels, vertical: boolean): number[] {
  const length = vertical ? image.width : image.height;
  const across = vertical ? image.height : image.width;
  const lines: number[] = [];
  let start = -1;
  for (let a = 0; a <= length; a++) {
    let dark = 0;
    if (a < length)
      for (let b = 0; b < across; b++) {
        const i = ((vertical ? b : a) * image.width + (vertical ? a : b)) * 4;
        const hi = Math.max(
          image.data[i],
          image.data[i + 1],
          image.data[i + 2],
        );
        const lo = Math.min(
          image.data[i],
          image.data[i + 1],
          image.data[i + 2],
        );
        if (image.data[i + 3] > 128 && (hi < 115 || (hi < 210 && hi - lo < 60)))
          dark++;
      }
    if (a < length && dark / across > 0.6) {
      if (start < 0) start = a;
    } else if (start >= 0) {
      // Ignore broad dark artwork; a printed grid line is narrow.
      if (a - start <= Math.max(3, length / 200))
        lines.push((start + a - 1) / 2);
      start = -1;
    }
  }
  return lines;
}

function regularAxis(lines: number[], length: number): number[] | null {
  if (lines.length < 6) return null;
  let best: {
    step: number;
    origin: number;
    matched: number[];
    score: number;
  } | null = null;
  const frequencies = new Map<number, number>();
  lines.slice(1).forEach((n, i) => {
    const gap = Math.round(n - lines[i]);
    if (gap >= 6 && gap < length / 4)
      frequencies.set(gap, (frequencies.get(gap) ?? 0) + 1);
  });
  const guesses = [...frequencies]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([gap]) => gap);
  // Fit a periodic lattice, allowing artwork to obscure some grid lines.
  for (const guess of guesses)
    for (let a = 0; a < lines.length - 1; a++)
      for (let b = a + 1; b < lines.length; b++) {
        const intervals = Math.round((lines[b] - lines[a]) / guess);
        if (intervals < 3) continue;
        const step = (lines[b] - lines[a]) / intervals;
        if (Math.abs(step - guess) > guess * 0.1) continue;
        const tolerance = Math.max(1.5, step * 0.035);
        const matched = lines.filter(
          (n) =>
            Math.abs(n - lines[a] - Math.round((n - lines[a]) / step) * step) <=
            tolerance,
        );
        const span = Math.round((matched.at(-1)! - matched[0]) / step);
        if (matched.length < 6 || matched.length / (span + 1) < 0.55) continue;
        const error = matched.reduce(
          (sum, n) =>
            sum +
            Math.abs(n - lines[a] - Math.round((n - lines[a]) / step) * step),
          0,
        );
        const score = matched.length - error / (tolerance * lines.length);
        if (!best || score > best.score)
          best = { step, origin: lines[a], matched, score };
      }
  if (!best) return null;
  const { step, origin, matched } = best;
  const first = Math.round((matched[0] - origin) / step),
    last = Math.round((matched.at(-1)! - origin) / step);
  const edges = Array.from(
    { length: last - first + 1 },
    (_, i) => origin + (first + i) * step,
  );
  // Include a cell cut slightly by the image edge, but never extend into a footer.
  if (edges[0] > step * 0.45 && edges[0] <= step * 1.15) edges.unshift(0);
  if (
    length - edges.at(-1)! > step * 0.85 &&
    length - edges.at(-1)! <= step * 1.15
  )
    edges.push(length);
  return edges.map((n) => Math.max(0, Math.min(length, n)));
}

export function detectChartGrid(image: Pixels): ChartGrid | null {
  if (image.width < 80 || image.height < 80) return null;
  const x = regularAxis(axisLines(image, true), image.width);
  const y = regularAxis(axisLines(image, false), image.height);
  if (!x || !y) return null;
  const sx = x[2] - x[1],
    sy = y[2] - y[1];
  return Math.abs(sx - sy) / Math.max(sx, sy) < 0.1 ? { x, y } : null;
}

function cellColor(
  image: Pixels,
  left: number,
  top: number,
  right: number,
  bottom: number,
): string {
  const channels: number[][] = [[], [], [], []];
  // Median of an interior patch avoids grid lines and JPEG ringing.
  for (let yy = 0; yy < 5; yy++)
    for (let xx = 0; xx < 5; xx++) {
      const x = Math.max(
        0,
        Math.min(
          image.width - 1,
          Math.floor(left + (right - left) * (0.35 + xx * 0.075)),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          image.height - 1,
          Math.floor(top + (bottom - top) * (0.35 + yy * 0.075)),
        ),
      );
      const i = (y * image.width + x) * 4;
      channels.forEach((channel, c) => channel.push(image.data[i + c]));
    }
  const [r, g, b, a] = channels.map(
    (channel) => channel.sort((a, b) => a - b)[12],
  );
  return a < 128 ? "" : `rgb(${r}, ${g}, ${b})`;
}

export function sampleChart(
  image: Pixels,
  grid: ChartGrid,
  cols: number,
  rows: number,
): string[] {
  const width = grid.x.length - 1,
    height = grid.y.length - 1;
  const colors = Array<string>(cols * rows).fill("");
  const offsetX = Math.floor((cols - width) / 2),
    offsetY = Math.floor((rows - height) / 2);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const bx = x + offsetX,
        by = y + offsetY;
      if (bx >= 0 && bx < cols && by >= 0 && by < rows)
        colors[by * cols + bx] = cellColor(
          image,
          grid.x[x],
          grid.y[y],
          grid.x[x + 1],
          grid.y[y + 1],
        );
    }
  return colors;
}
