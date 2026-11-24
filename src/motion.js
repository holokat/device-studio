const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const EPSILON = 1e-7;
const LUT = 120;

const PRESETS = {
  'ease-in-out': [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
};

function cubic(a, b, c, t) {
  const inverse = 1 - t;
  return 3 * inverse * inverse * t * a + 3 * inverse * t * t * b + t * t * t * c;
}

function cubicDerivative(a, b, c, t) {
  const inverse = 1 - t;
  return 3 * inverse * inverse * a + 6 * inverse * t * (b - a) + 3 * t * t * (c - b);
}

function solveAxis(value, a, b) {
  // Newton converges quickly near the centre. A bounded bisection finish makes
  // the inverse deterministic for all valid monotonic handle positions.
  let parameter = value;
  for (let iteration = 0; iteration < 7; iteration += 1) {
    const slope = cubicDerivative(a, b, 1, parameter);
    if (Math.abs(slope) < EPSILON) break;
    const next = parameter - (cubic(a, b, 1, parameter) - value) / slope;
    if (next < 0 || next > 1) break;
    parameter = next;
  }
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const point = cubic(a, b, 1, parameter);
    if (Math.abs(point - value) < EPSILON) return parameter;
    if (point < value) low = parameter;
    else high = parameter;
    parameter = (low + high) / 2;
  }
  return parameter;
}

function number(value) {
  return Number.parseFloat(value) || 0;
}

/**
 * Installs an assembly-only timing editor into `root`.
 * `sample(t)` and `timeAt(progress)` both use normalized 0…1 time.
 */
export function bindMotionControls(root, onCurveChange = () => {}) {
  if (!(root instanceof Element)) throw new TypeError('bindMotionControls needs a container element');

  const state = {
    speed: 1,
    mode: 'ease-in-out',
    handles: [...PRESETS['ease-in-out']],
    customHandles: [...PRESETS['ease-in-out']],
    lut: new Float32Array(LUT + 1),
  };
  const graph = { width: 240, height: 124, pad: 12 };
  const spanX = graph.width - graph.pad * 2;
  const spanY = graph.height - graph.pad * 2;
  // The freehand graph leaves headroom above 1 and below 0 for overshoot and
  // anticipation. Camera moves use the raw value; assembly clamps to 0…1.
  const draw = { width: 240, height: 160, padX: 12, padY: 30 };
  const drawX = draw.width - draw.padX * 2;
  const drawY = draw.height - draw.padY * 2;

  root.innerHTML = `
    <section class="motion-editor" aria-labelledby="motion-title">
      <div class="motion-editor__head">
        <div><h3 id="motion-title">Timing curve</h3><p>Assembly and cinematic moves</p></div>
        <output id="motion-duration" aria-live="polite">1.20 s</output>
      </div>
      <div class="motion-speed-row">
        <label for="motion-speed">Speed</label>
        <input id="motion-speed" type="range" min="0.25" max="2" step="0.25" value="1" aria-describedby="motion-speed-value">
        <output id="motion-speed-value">1×</output>
      </div>
      <fieldset class="motion-presets"><legend>Easing</legend>
        <button type="button" data-motion-preset="ease-in-out" aria-pressed="true" aria-label="Ease in-out" data-tip="Ease in-out"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path class="axis" d="M4 20H20" /><path d="M4 20C11 20 13 4 20 4"/></svg></button>
        <button type="button" data-motion-preset="linear" aria-pressed="false" aria-label="Linear" data-tip="Linear"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path class="axis" d="M4 20H20" /><path d="M4 20L20 4"/></svg></button>
        <button type="button" data-motion-preset="ease-in" aria-pressed="false" aria-label="Ease in" data-tip="Ease in"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path class="axis" d="M4 20H20" /><path d="M4 20C12 20 17 14 20 4"/></svg></button>
        <button type="button" data-motion-preset="ease-out" aria-pressed="false" aria-label="Ease out" data-tip="Ease out"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path class="axis" d="M4 20H20" /><path d="M4 20C7 10 12 4 20 4"/></svg></button>
        <button type="button" data-motion-preset="custom" aria-pressed="false" aria-label="Bézier" data-tip="Bézier"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path class="axis" d="M4 20H20" /><path d="M4 20C6 8 18 16 20 4"/><path class="h" d="M4 20L6 8M20 4L18 16"/><circle cx="6" cy="8" r="1.6"/><circle cx="18" cy="16" r="1.6"/></svg></button>
        <button type="button" data-motion-preset="freehand" aria-pressed="false" aria-label="Freehand" data-tip="Freehand"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path class="axis" d="M4 20H20" /><path d="M4 19C6 19 6 13 9 13S11 17 13 15 15 7 17 7 19 5 20 4"/></svg></button>
      </fieldset>
      <div class="motion-freehand" id="motion-freehand" hidden>
        <div class="motion-curve-wrap">
          <svg id="motion-draw" class="motion-curve motion-draw" viewBox="0 0 240 160" role="img" aria-label="Freehand easing curve. Draw across the graph to reshape it.">
            <rect class="motion-draw__band" x="12" y="30" width="216" height="100" />
            <path class="motion-curve__grid" d="M12 30H228 M12 130H228 M12 80H228 M66 30V130 M120 30V130 M174 30V130" />
            <path id="motion-draw-path" class="motion-curve__path" />
            <circle class="motion-curve__pin" cx="12" cy="130" r="3" /><circle class="motion-curve__pin" cx="228" cy="30" r="3" />
          </svg>
          <p class="motion-curve-hint">Draw left to right. Redraw any stretch to touch it up. Above the band overshoots.</p>
        </div>
        <div class="motion-draw-tools">
          <button type="button" id="motion-smooth">Smooth</button>
          <button type="button" id="motion-reset">Reset</button>
        </div>
      </div>
      <div class="motion-custom" id="motion-custom" hidden>
      <div class="motion-curve-wrap">
        <svg id="motion-curve" class="motion-curve" viewBox="0 0 240 124" role="img" aria-label="Cubic Bézier easing curve with two editable handles">
          <path class="motion-curve__grid" d="M12 12V112H228 M12 62H228 M120 12V112" />
          <path id="motion-line-one" class="motion-curve__guide" />
          <path id="motion-line-two" class="motion-curve__guide" />
          <path id="motion-curve-path" class="motion-curve__path" />
          <circle id="motion-handle-one" class="motion-curve__handle" r="6" tabindex="0" role="slider" aria-label="First Bézier handle" aria-valuemin="0" aria-valuemax="1" />
          <circle id="motion-handle-two" class="motion-curve__handle" r="6" tabindex="0" role="slider" aria-label="Second Bézier handle" aria-valuemin="0" aria-valuemax="1" />
        </svg>
        <p class="motion-curve-hint">Drag points or use arrow keys.</p>
      </div>
      <div class="motion-values" aria-label="Cubic Bézier handle values">
        <label>Handle 1 x<input id="motion-handle-one-x" type="number" min="0" max="1" step="0.01" inputmode="decimal"></label>
        <label>Handle 1 y<input id="motion-handle-one-y" type="number" min="0" max="1" step="0.01" inputmode="decimal"></label>
        <label>Handle 2 x<input id="motion-handle-two-x" type="number" min="0" max="1" step="0.01" inputmode="decimal"></label>
        <label>Handle 2 y<input id="motion-handle-two-y" type="number" min="0" max="1" step="0.01" inputmode="decimal"></label>
      </div>
      </div>
    </section>`;

  const byId = (id) => root.querySelector(`#${id}`);
  const speedInput = byId('motion-speed');
  const speedValue = byId('motion-speed-value');
  const durationValue = byId('motion-duration');
  const curve = byId('motion-curve');
  const curvePath = byId('motion-curve-path');
  const customControls = byId('motion-custom');
  const freehandControls = byId('motion-freehand');
  const drawSvg = byId('motion-draw');
  const drawPath = byId('motion-draw-path');
  const guideOne = byId('motion-line-one');
  const guideTwo = byId('motion-line-two');
  const nodes = [byId('motion-handle-one'), byId('motion-handle-two')];
  const values = [
    [byId('motion-handle-one-x'), byId('motion-handle-one-y')],
    [byId('motion-handle-two-x'), byId('motion-handle-two-y')],
  ];

  const controller = {
    get duration() { return 1.2 / state.speed; },
    sample(time) {
      return clamp(controller.sampleRaw(time));
    },
    sampleRaw(time) {
      const t = clamp(number(time));
      if (state.mode === 'freehand') return lutAt(t);
      if (t === 0 || t === 1) return t;
      const [x1, y1, x2, y2] = state.handles;
      return clamp(cubic(y1, y2, 1, solveAxis(t, x1, x2)));
    },
    timeAt(progress) {
      const value = clamp(number(progress));
      if (value === 0) return 0;
      if (value === 1) return 1;
      if (state.mode === 'freehand') {
        for (let i = 1; i <= LUT; i += 1) {
          if (state.lut[i] >= value) {
            const a = state.lut[i - 1], b = state.lut[i];
            return clamp((i - 1 + (b === a ? 0 : (value - a) / (b - a))) / LUT);
          }
        }
        return 1;
      }
      const [x1, y1, x2, y2] = state.handles;
      return clamp(cubic(x1, x2, 1, solveAxis(value, y1, y2)));
    },
  };

  function lutAt(t) {
    const f = t * LUT, i = Math.min(LUT - 1, Math.floor(f)), r = f - i;
    return state.lut[i] + (state.lut[i + 1] - state.lut[i]) * r;
  }
  function seedLut() {
    // Start freehand from whatever curve is showing so the first stroke edits it.
    const keep = state.mode;
    if (keep === 'freehand') state.mode = 'custom';
    for (let i = 0; i <= LUT; i += 1) state.lut[i] = controller.sampleRaw(i / LUT);
    state.mode = keep;
  }
  function drawPoint(x, y) {
    return [draw.padX + x * drawX, draw.height - draw.padY - y * drawY];
  }
  function renderFreehand() {
    let d = '';
    for (let i = 0; i <= LUT; i += 1) {
      const [x, y] = drawPoint(i / LUT, state.lut[i]);
      d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    drawPath.setAttribute('d', d);
  }
  function point(x, y) {
    return [graph.pad + x * spanX, graph.height - graph.pad - y * spanY];
  }

  function updatePresetButtons() {
    root.querySelectorAll('[data-motion-preset]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.motionPreset === state.mode));
    });
  }

  function notify() {
    onCurveChange({
      speed: state.speed,
      duration: controller.duration,
      easing: state.mode,
      curve: [...state.handles],
      sample: controller.sample,
      timeAt: controller.timeAt,
    });
  }

  function render(emit = true) {
    const [x1, y1, x2, y2] = state.handles;
    const start = point(0, 0);
    const first = point(x1, y1);
    const second = point(x2, y2);
    const end = point(1, 1);
    curvePath.setAttribute('d', `M ${start[0]} ${start[1]} C ${first[0]} ${first[1]}, ${second[0]} ${second[1]}, ${end[0]} ${end[1]}`);
    guideOne.setAttribute('d', `M ${start[0]} ${start[1]} L ${first[0]} ${first[1]}`);
    guideTwo.setAttribute('d', `M ${end[0]} ${end[1]} L ${second[0]} ${second[1]}`);
    [first, second].forEach(([x, y], index) => {
      const node = nodes[index];
      node.setAttribute('cx', x);
      node.setAttribute('cy', y);
      node.setAttribute('aria-valuenow', state.handles[index * 2].toFixed(2));
      node.setAttribute('aria-valuetext', `${state.handles[index * 2].toFixed(2)}, ${state.handles[index * 2 + 1].toFixed(2)}`);
      values[index][0].value = state.handles[index * 2].toFixed(2);
      values[index][1].value = state.handles[index * 2 + 1].toFixed(2);
    });
    speedValue.textContent = `${state.speed}×`;
    speedInput.style.setProperty('--motion-progress', `${((state.speed - 0.25) / 1.75) * 100}%`);
    durationValue.textContent = `${controller.duration.toFixed(2)} s`;
    customControls.hidden = state.mode !== 'custom';
    freehandControls.hidden = state.mode !== 'freehand';
    renderFreehand();
    updatePresetButtons();
    if (emit) notify();
  }

  function setHandle(index, axis, value, emit = true) {
    const xIndex = index * 2;
    const target = xIndex + axis;
    const min = axis === 0 && index === 1 ? state.handles[0] : 0;
    const max = axis === 0 && index === 0 ? state.handles[2] : 1;
    state.handles[target] = clamp(value, min, max);
    state.mode = 'custom';
    state.customHandles = [...state.handles];
    render(emit);
  }

  root.querySelectorAll('[data-motion-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.motionPreset;
      if (mode === 'freehand') {
        if (state.mode !== 'freehand' && !state.drawn) { seedLut(); state.drawn = true; }
        state.mode = mode;
        render();
        return;
      }
      state.mode = mode;
      if (mode === 'custom') state.handles = [...state.customHandles];
      else state.handles = [...PRESETS[mode]];
      render();
    });
  });

  speedInput.addEventListener('input', () => {
    state.speed = clamp(number(speedInput.value), 0.25, 2);
    render();
  });

  values.forEach((pair, index) => pair.forEach((input, axis) => {
    input.addEventListener('change', () => setHandle(index, axis, number(input.value)));
  }));

  let activeHandle = null;
  function updateFromPointer(event) {
    if (activeHandle === null) return;
    const bounds = curve.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left - (graph.pad / graph.width) * bounds.width) / (bounds.width * spanX / graph.width));
    const y = clamp(1 - (event.clientY - bounds.top - (graph.pad / graph.height) * bounds.height) / (bounds.height * spanY / graph.height));
    setHandle(activeHandle, 0, x, false);
    setHandle(activeHandle, 1, y);
  }
  nodes.forEach((node, index) => {
    node.addEventListener('pointerdown', (event) => {
      activeHandle = index;
      node.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    node.addEventListener('pointermove', updateFromPointer);
    node.addEventListener('pointerup', () => { activeHandle = null; });
    node.addEventListener('pointercancel', () => { activeHandle = null; });
    node.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 0.1 : 0.02;
      const deltas = { ArrowLeft: [0, -step], ArrowRight: [0, step], ArrowDown: [1, -step], ArrowUp: [1, step] };
      if (!(event.key in deltas)) return;
      event.preventDefault();
      const [axis, delta] = deltas[event.key];
      setHandle(index, axis, state.handles[index * 2 + axis] + delta);
    });
  });

  // Freehand drawing: each stroke writes into the lookup table between the
  // samples it crosses, so partial strokes refine only that stretch.
  let stroke = null;
  function drawCoords(event) {
    const b = drawSvg.getBoundingClientRect();
    const x = ((event.clientX - b.left) / b.width * draw.width - draw.padX) / drawX;
    const y = (draw.height - draw.padY - (event.clientY - b.top) / b.height * draw.height) / drawY;
    return [clamp(x), clamp(y, -0.3, 1.3)];
  }
  function paint(from, to) {
    let [x0, y0] = from, [x1, y1] = to;
    if (x1 < x0) [x0, y0, x1, y1] = [x1, y1, x0, y0];
    const i0 = Math.round(x0 * LUT), i1 = Math.round(x1 * LUT);
    for (let i = i0; i <= i1; i += 1) {
      const r = i1 === i0 ? 1 : (i - i0) / (i1 - i0);
      state.lut[i] = y0 + (y1 - y0) * r;
    }
    state.lut[0] = 0;
    state.lut[LUT] = 1;
  }
  drawSvg.addEventListener('pointerdown', (event) => {
    stroke = drawCoords(event);
    paint(stroke, stroke);
    drawSvg.setPointerCapture(event.pointerId);
    renderFreehand();
    event.preventDefault();
  });
  drawSvg.addEventListener('pointermove', (event) => {
    if (!stroke) return;
    const next = drawCoords(event);
    paint(stroke, next);
    stroke = next;
    renderFreehand();
  });
  const endStroke = () => { if (!stroke) return; stroke = null; smooth(1); notify(); };
  drawSvg.addEventListener('pointerup', endStroke);
  drawSvg.addEventListener('pointercancel', endStroke);
  function smooth(passes) {
    for (let p = 0; p < passes; p += 1) {
      const prev = Float32Array.from(state.lut);
      for (let i = 1; i < LUT; i += 1) state.lut[i] = (prev[i - 1] + 2 * prev[i] + prev[i + 1]) / 4;
    }
    renderFreehand();
  }
  byId('motion-smooth').addEventListener('click', () => { smooth(4); notify(); });
  byId('motion-reset').addEventListener('click', () => {
    for (let i = 0; i <= LUT; i += 1) state.lut[i] = cubic(0, 1, 1, solveAxis(i / LUT, 0.42, 0.58));
    renderFreehand();
    notify();
  });

  seedLut();
  render();
  return controller;
}
