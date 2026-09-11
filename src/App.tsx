import { detectChartGrid, sampleChart } from "./pattern-import";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Grid2X2,
  ImagePlus,
  LockKeyhole,
  Maximize,
  Minus,
  Move,
  Plus,
  RotateCw,
  Sparkles,
  Sun,
  X,
} from "lucide-react";

type Pattern = {
  name: string;
  width: number;
  height: number;
  colors: string[];
};
const N = 29;
function sample(): Pattern {
  const colors = Array<string>(N * N).fill("");
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < N && y >= 0 && y < N) colors[y * N + x] = c;
  };
  // A little pixel tulip, drawn directly on the bead grid.
  for (let y = 14; y < 25; y++)
    for (let x = 13; x < 16; x++) set(x, y, "#526d46");
  for (let y = 17; y < 23; y++)
    for (let x = 7; x < 14; x++)
      if (x >= 7 + (y - 17) && x <= 10 + (y - 17)) set(x, y, "#789357");
  for (let y = 16; y < 22; y++)
    for (let x = 15; x < 22; x++)
      if (x >= 20 - (y - 16) && x <= 22 - (y - 16)) set(x, y, "#789357");
  for (let y = 5; y < 15; y++)
    for (let x = 7; x < 22; x++) {
      const edge =
        y < 8
          ? (x >= 7 && x <= 10) || (x >= 13 && x <= 15) || (x >= 18 && x <= 21)
          : y < 12
            ? true
            : y === 12
              ? x >= 8 && x <= 20
              : y === 13
                ? x >= 10 && x <= 18
                : x >= 12 && x <= 16;
      if (edge) set(x, y, x < 12 ? "#c96b62" : x < 17 ? "#e3927c" : "#efb09a");
    }
  return { name: "Little tulip", width: N, height: N, colors };
}
const demo = sample();
function readScale() {
  try {
    const n = Number(localStorage.getItem("peg-pixel-scale"));
    return n >= 2 && n <= 12 ? n : 3.78;
  } catch {
    return 3.78;
  }
}
export default function App() {
  const [pattern, setPattern] = useState<Pattern>(demo);
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [importMode, setImportMode] = useState("auto");
  const [cols, setCols] = useState(29),
    [rows, setRows] = useState(29);
  const [pitch, setPitch] = useState(5),
    [scale, setScale] = useState(readScale);
  const [calibrationScale, setCalibrationScale] = useState(scale);
  const calibrationUnit = pitch * calibrationScale;
  const [grid, setGrid] = useState(true),
    [beads, setBeads] = useState(false);
  const [opacity, setOpacity] = useState(100),
    [rotation, setRotation] = useState(0);
  const [calibrate, setCalibrate] = useState(false),
    [locked, setLocked] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 }),
    [error, setError] = useState("");
  const [wake, setWake] = useState(false);
  const [calibrated, setCalibrated] = useState(() => {
    try {
      return localStorage.getItem("peg-pixel-calibrated") === "yes";
    } catch {
      return false;
    }
  });
  const fileRef = useRef<HTMLInputElement>(null),
    canvasRef = useRef<HTMLCanvasElement>(null),
    modalRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(
    null,
  );
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unit = pitch * scale;
  const analyzed = useMemo(() => {
    if (!source) return null;
    const canvas = document.createElement("canvas");
    const ratio = Math.min(
      1,
      1600 / Math.max(source.naturalWidth, source.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(source.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * ratio));
    const context = canvas.getContext("2d")!;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    return { pixels, grid: detectChartGrid(pixels) };
  }, [source]);
  const chart = importMode === "auto" ? analyzed?.grid : null;
  const chartTooLarge =
    !!chart && (chart.x.length - 1 > cols || chart.y.length - 1 > rows);
  useEffect(() => {
    if (!source) {
      const colors = Array.from(
        { length: cols * rows },
        (_, i) =>
          demo.colors[
            Math.min(28, Math.floor((Math.floor(i / cols) * 29) / rows)) * 29 +
              Math.min(28, Math.floor(((i % cols) * 29) / cols))
          ],
      );
      setPattern({ ...demo, width: cols, height: rows, colors });
      return;
    }
    if (chart && analyzed) {
      setPattern((p) => ({
        ...p,
        width: cols,
        height: rows,
        colors: sampleChart(analyzed.pixels, chart, cols, rows),
      }));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    const ratio = Math.min(
      cols / source.naturalWidth,
      rows / source.naturalHeight,
    );
    const w = Math.max(1, Math.round(source.naturalWidth * ratio)),
      h = Math.max(1, Math.round(source.naturalHeight * ratio));
    ctx.drawImage(
      source,
      Math.floor((cols - w) / 2),
      Math.floor((rows - h) / 2),
      w,
      h,
    );
    const data = ctx.getImageData(0, 0, cols, rows).data;
    const colors = Array.from({ length: cols * rows }, (_, i) =>
      data[i * 4 + 3] < 128
        ? ""
        : `rgb(${data[i * 4]}, ${data[i * 4 + 1]}, ${data[i * 4 + 2]})`,
    );
    setPattern((p) => ({ ...p, width: cols, height: rows, colors }));
  }, [source, cols, rows, analyzed, chart]);
  useEffect(() => {
    try {
      localStorage.setItem("peg-pixel-scale", String(scale));
    } catch {}
  }, [scale]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = cols * unit,
      h = rows * unit,
      dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.globalAlpha = opacity / 100;
    pattern.colors.forEach((color, i) => {
      if (!color) return;
      const x = ((i % pattern.width) - pattern.width / 2) * unit,
        y = (Math.floor(i / pattern.width) - pattern.height / 2) * unit;
      ctx.fillStyle = color;
      if (beads) {
        ctx.beginPath();
        ctx.arc(x + unit / 2, y + unit / 2, unit * 0.44, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fffdf8";
        ctx.beginPath();
        ctx.arc(x + unit / 2, y + unit / 2, unit * 0.12, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(x, y, unit + 0.1, unit + 0.1);
    });
    ctx.restore();
    if (grid) {
      ctx.strokeStyle = "rgba(78,83,59,.16)";
      ctx.lineWidth = 0.65;
      ctx.beginPath();
      for (let x = 0; x <= cols; x++) {
        ctx.moveTo(x * unit, 0);
        ctx.lineTo(x * unit, h);
      }
      for (let y = 0; y <= rows; y++) {
        ctx.moveTo(0, y * unit);
        ctx.lineTo(w, y * unit);
      }
      ctx.stroke();
      ctx.fillStyle = "rgba(65,70,50,.24)";
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          ctx.beginPath();
          ctx.arc((x + 0.5) * unit, (y + 0.5) * unit, 1, 0, Math.PI * 2);
          ctx.fill();
        }
    }
  }, [pattern, cols, rows, unit, grid, beads, opacity, rotation]);
  useEffect(() => {
    if (!locked) return;
    let sentinel: { release: () => Promise<void> } | undefined;
    let cancelled = false;
    const request = async () => {
      try {
        if ("wakeLock" in navigator) {
          const s = await (
            navigator as Navigator & {
              wakeLock: {
                request: (
                  type: string,
                ) => Promise<{ release: () => Promise<void> }>;
              };
            }
          ).wakeLock.request("screen");
          if (cancelled) await s.release();
          else {
            sentinel = s;
            setWake(true);
          }
        }
      } catch {
        setWake(false);
      }
    };
    void request();
    const visible = () => {
      if (document.visibilityState === "visible") void request();
      else setWake(false);
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      cancelled = true;
      void sentinel?.release();
      setWake(false);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [locked]);
  useEffect(
    () => () => {
      if (hold.current) clearTimeout(hold.current);
    },
    [],
  );
  const upload = (file?: File) => {
    if (!file) return;
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
        "image/bmp",
      ].includes(file.type)
    ) {
      setError("Choose a PNG, JPEG, WebP, GIF, or BMP image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Please choose an image smaller than 20 MB.");
      return;
    }
    setError("");
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setPattern((p) => ({ ...p, name: file.name.replace(/\.[^.]+$/, "") }));
      setSource(img);
      setImportMode("auto");
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("That image could not be opened. Try a PNG or JPEG.");
    };
    img.src = url;
  };
  useEffect(() => {
    if (!calibrate) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCalibrate(false);
      if (e.key === "Tab") {
        const items =
          modalRef.current?.querySelectorAll<HTMLElement>("button, input");
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [calibrate]);
  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current);
  };
  const startBeading = () => {
    setOffset({ x: 0, y: 0 });
    setLocked(true);
  };
  return (
    <div className={locked ? "app is-locked" : "app"}>
      {!locked && (
        <>
          <header>
            <a className="brand" href="./">
              <span className="brand-mark">
                <i />
                <i />
                <i />
                <i />
              </span>
              Peg <span className="amp">&</span> Pixel
            </a>
            <span className="header-caption">
              A little patience. A lot of little beads.
            </span>
            <span className="device-tag">
              <span /> Made for your bead board
            </span>
          </header>
          <div className="intro">
            <div>
              <div className="eyebrow">YOUR LITTLE MAKING SPACE</div>
              <h1>From pixels to something real.</h1>
              <p>
                Load a pattern, line up your board, and make it bead by bead.
              </p>
            </div>
            <span className="project-tag">
              <span /> {cols} × {rows} board
            </span>
          </div>
        </>
      )}
      <main>
        {!locked && (
          <aside>
            <section>
              <div className="section-heading">
                <span className="step">01</span>
                <h2>Your pattern</h2>
              </div>
              <button
                className="upload"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  upload(e.dataTransfer.files[0]);
                }}
              >
                <span className="upload-icon">
                  <ImagePlus size={24} />
                </span>
                <strong>Upload a pixel image</strong>
                <span>or drop it right here</span>
                <small>PNG, JPG, WebP · up to 20 MB</small>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
                hidden
                onChange={(e) => {
                  upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <div className="loaded">
                <span className="file-icon">
                  <Grid2X2 size={19} />
                </span>
                <div>
                  <strong>{pattern.name}</strong>
                  <small>
                    {source
                      ? chart
                        ? `${chart.x.length - 1} × ${chart.y.length - 1} chart · one cell per bead`
                        : "Pixel image · fitted to board"
                      : "Example pattern · try it out"}
                  </small>
                </div>
                <Check size={16} />
              </div>
              {source && (
                <>
                  <label className="field-label" htmlFor="import-mode">
                    Image type
                  </label>
                  <div className="select-wrap">
                    <select
                      id="import-mode"
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value)}
                    >
                      <option value="auto">Auto · detect chart grid</option>
                      <option value="pixels">Plain pixel image</option>
                    </select>
                    <ChevronDown size={16} />
                  </div>
                  <p className="help">
                    {chart
                      ? "Chart grid detected. Grid lines and the legend are excluded; each square maps to one bead."
                      : importMode === "pixels"
                        ? "The whole image is fitted to your board."
                        : "No chart grid detected. The whole image is fitted to your board."}
                  </p>
                  {chartTooLarge && (
                    <p className="error" role="alert">
                      This chart is larger than your board. Only the center is
                      visible. Select a larger board to see the complete
                      pattern.
                    </p>
                  )}
                </>
              )}
              {source && (
                <button
                  className="text-button"
                  onClick={() => {
                    setSource(null);
                    setRotation(0);
                  }}
                >
                  Use example pattern
                </button>
              )}
            </section>
            <section>
              <div className="section-heading">
                <span className="step">02</span>
                <h2>Match your board</h2>
              </div>
              <label className="field-label" htmlFor="board">
                Board size
              </label>
              <div className="select-wrap">
                <select
                  id="board"
                  value={`${cols}`}
                  onChange={(e) => {
                    setCols(+e.target.value);
                    setRows(+e.target.value);
                    setOffset({ x: 0, y: 0 });
                  }}
                >
                  <option value="29">29 × 29 · Square board</option>
                  <option value="14">14 × 14 · Small square</option>
                  <option value="58">58 × 58 · Four boards</option>
                </select>
                <ChevronDown size={16} />
              </div>
              <label className="field-label" htmlFor="pitch">
                Peg spacing <span>center to center</span>
              </label>
              <div className="number-field">
                <input
                  id="pitch"
                  type="number"
                  min="2"
                  max="10"
                  step="0.1"
                  value={pitch}
                  onChange={(e) =>
                    setPitch(
                      Math.max(2, Math.min(10, Number(e.target.value) || 5)),
                    )
                  }
                />
                <span>mm</span>
              </div>
              <button
                className="calibrate-button"
                onClick={() => {
                  setCalibrationScale(scale);
                  setCalibrate(true);
                }}
              >
                <Grid2X2 size={18} />
                {calibrated ? "Recalibrate screen" : "Calibrate screen"}
                <span>{calibrated ? <Check size={15} /> : "↗"}</span>
              </button>
              <p className="help">
                Place your board on the screen and match the dots to its pegs.
              </p>
            </section>
            <section>
              <div className="section-heading">
                <span className="step">03</span>
                <h2>Make it yours</h2>
              </div>
              <div className="toggle-row">
                <span>Show peg grid</span>
                <button
                  className={`switch ${grid ? "on" : ""}`}
                  role="switch"
                  aria-checked={grid}
                  aria-label="Show peg grid"
                  onClick={() => setGrid(!grid)}
                >
                  <i />
                </button>
              </div>
              <div className="toggle-row">
                <span>Bead preview</span>
                <button
                  className={`switch ${beads ? "on" : ""}`}
                  role="switch"
                  aria-checked={beads}
                  aria-label="Bead preview"
                  onClick={() => setBeads(!beads)}
                >
                  <i />
                </button>
              </div>
              <label className="range-label" htmlFor="opacity">
                <span>Pattern opacity</span>
                <span>{opacity}%</span>
              </label>
              <input
                id="opacity"
                type="range"
                min="20"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(+e.target.value)}
              />
            </section>
            <div className="private-note">
              <LockKeyhole size={13} /> Your images stay on this device.
            </div>
          </aside>
        )}
        <div className="workspace">
          {!locked && (
            <div className="workspace-toolbar">
              <div>
                <span className="live-dot" /> Pattern preview{" "}
                <span className="toolbar-divider">/</span>
                <span className="muted">
                  {cols} × {rows}
                </span>
              </div>
              <div className="toolbar-actions">
                <button
                  title="Rotate pattern 90°"
                  aria-label="Rotate pattern 90 degrees"
                  onClick={() => setRotation((rotation + 90) % 360)}
                >
                  <RotateCw size={18} />
                </button>
                <button
                  title="Center pattern"
                  aria-label="Center pattern"
                  onClick={() => setOffset({ x: 0, y: 0 })}
                >
                  <Maximize size={18} />
                </button>
              </div>
            </div>
          )}
          <div
            className="board-stage"
            onPointerDown={(e) => {
              if (locked || e.target instanceof HTMLButtonElement) return;
              drag.current = {
                x: e.clientX,
                y: e.clientY,
                ox: offset.x,
                oy: offset.y,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current || locked) return;
              setOffset({
                x: drag.current.ox + e.clientX - drag.current.x,
                y: drag.current.oy + e.clientY - drag.current.y,
              });
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
          >
            {!locked && (
              <span className="canvas-note">
                A SMALL PATTERN. A HAPPY AFTERNOON.
              </span>
            )}
            <div
              className="board"
              style={{
                width: cols * unit,
                height: rows * unit,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            >
              <canvas
                ref={canvasRef}
                style={{ width: cols * unit, height: rows * unit }}
                aria-label={`${pattern.name}, ${cols} by ${rows} bead pattern`}
              />
              {!locked && (
                <>
                  <span className="dimension top">{cols} beads</span>
                  <span className="dimension side">{rows} beads</span>
                </>
              )}
            </div>
            {!locked && (
              <span className="drag-hint">
                <Move size={14} /> Drag to position your pattern
              </span>
            )}
          </div>
          {!locked && (
            <>
              <div className="canvas-footer">
                <span>
                  <span className={`status-dot ${calibrated ? "ready" : ""}`} />
                  {calibrated
                    ? "Screen calibrated"
                    : "Calibrate for true-to-size placement"}
                </span>
                <span>
                  {Math.round(cols * pitch)} × {Math.round(rows * pitch)} mm
                </span>
              </div>
              <div className="start-panel">
                <div className="start-icon">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3>Ready for a little bead time?</h3>
                  <p>
                    Place your clear board on the screen. Lock it and start
                    creating.
                  </p>
                </div>
                <button className="primary" onClick={startBeading}>
                  <LockKeyhole size={17} /> Start beading <span>↗</span>
                </button>
              </div>
              <p className="bottom-note">
                <Sun size={14} /> A brighter screen makes a better guide. Turn
                up your iPad brightness.
              </p>
            </>
          )}
        </div>
      </main>
      {locked && (
        <>
          <div className="lock-banner">
            <LockKeyhole size={16} />
            <span>
              Beading mode{" "}
              <small>
                {wake
                  ? "Screen will stay awake"
                  : "Keep your screen awake in device settings"}
              </small>
            </span>
          </div>
          <button
            className="unlock"
            onPointerDown={() => {
              hold.current = setTimeout(() => setLocked(false), 1000);
            }}
            onPointerUp={cancelHold}
            onPointerCancel={cancelHold}
            onPointerLeave={cancelHold}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setLocked(false);
              }
            }}
          >
            <LockKeyhole size={16} /> Hold 1 second to unlock
          </button>
        </>
      )}
      {calibrate && (
        <div className="calibration-shade">
          <div
            ref={modalRef}
            className="calibration-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calibration-title"
          >
            <div className="calibration-heading">
              <button
                autoFocus
                className="close"
                aria-label="Close calibration"
                onClick={() => setCalibrate(false)}
              >
                <X size={20} />
              </button>
              <div className="eyebrow">CALIBRATE WITH YOUR BOARD</div>
              <h2 id="calibration-title">Line up the pegs.</h2>
              <p>
                Place your clear {cols} × {rows} board on the screen. Align its
                top-left peg with the coral dot, then adjust the spacing until
                the dots match the peg centers across rows and columns.
              </p>
            </div>
            <div className="calibration-stage">
              <svg
                className="calibration-grid"
                width={(cols - 1) * calibrationUnit + 24}
                height={(rows - 1) * calibrationUnit + 24}
                role="img"
                aria-label={`${cols} by ${rows} calibration dots. The coral dot marks the top-left peg.`}
              >
                {Array.from({ length: rows }, (_, y) => (
                  <line
                    key={`row-${y}`}
                    x1={12}
                    y1={12 + y * calibrationUnit}
                    x2={12 + (cols - 1) * calibrationUnit}
                    y2={12 + y * calibrationUnit}
                    stroke="#e0e5d7"
                  />
                ))}
                {Array.from({ length: cols }, (_, x) => (
                  <line
                    key={`col-${x}`}
                    x1={12 + x * calibrationUnit}
                    y1={12}
                    x2={12 + x * calibrationUnit}
                    y2={12 + (rows - 1) * calibrationUnit}
                    stroke="#e0e5d7"
                  />
                ))}
                {Array.from({ length: cols * rows }, (_, i) => (
                  <circle
                    key={i}
                    cx={12 + (i % cols) * calibrationUnit}
                    cy={12 + Math.floor(i / cols) * calibrationUnit}
                    r={i === 0 ? 4 : 2.5}
                    fill={i === 0 ? "#c96b62" : "#36563e"}
                  />
                ))}
                <circle cx={12} cy={12} r={8} fill="none" stroke="#c96b62" />
              </svg>
            </div>
            <div className="calibration-footer">
              <label className="range-label" htmlFor="calibration-spacing">
                <span>Peg spacing</span>
                <span>Smaller ↔ Larger</span>
              </label>
              <div className="scale-controls">
                <button
                  aria-label="Decrease calibration"
                  onClick={() =>
                    setCalibrationScale(
                      Math.max(2, +(calibrationScale - 0.01).toFixed(2)),
                    )
                  }
                >
                  <Minus size={18} />
                </button>
                <input
                  id="calibration-spacing"
                  aria-label="Calibration peg spacing"
                  type="range"
                  min="2"
                  max="12"
                  step="0.01"
                  value={calibrationScale}
                  onChange={(e) => setCalibrationScale(+e.target.value)}
                />
                <button
                  aria-label="Increase calibration"
                  onClick={() =>
                    setCalibrationScale(
                      Math.min(12, +(calibrationScale + 0.01).toFixed(2)),
                    )
                  }
                >
                  <Plus size={18} />
                </button>
              </div>
              <p className="help">
                Match peg centers, not board edges. If the whole board doesn’t
                fit, match as many visible pegs as possible. Recalibrate after
                changing browser zoom or devices.
              </p>
              <button
                className="primary"
                onClick={() => {
                  setScale(calibrationScale);
                  setCalibrated(true);
                  try {
                    localStorage.setItem("peg-pixel-calibrated", "yes");
                  } catch {}
                  setCalibrate(false);
                }}
              >
                <Check size={18} /> Pegs line up · Save calibration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
