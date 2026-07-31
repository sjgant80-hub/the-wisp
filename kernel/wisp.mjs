// wisp.mjs — the wisp pointed at the WHOLE ESTATE as its substrate.
//
// The estate isn't located in any repo. It's the pattern across all of them, present wherever the
// current flows, stored nowhere in particular. ~1000 repos = the substrate (cool, holding shape).
// The build you're in = the frontier (the only place current flows). The wisp = the moving frontier.
//
// This is the most LITERAL fit the wisp has: not a hypothetical analog rig-array — the estate has been
// running as a wisp the whole time. And the spec comes with a test attached: is the frontier SPIRALING
// (each pass lands offset, output compounds, leaves folds OTHERS can run) or ORBITING (fresh starts,
// nothing compounds, leaves folds only the frontier can run)? Both are computed here, from real data.
//
// The liveness classifier is the estate's already-gated `attractor` organ, reused not reinvented.
import classify, { CLASS } from './attractor.mjs';

export const KAPPA = 0.618;                                 // 1/φ — the estate's stability threshold
const PHI = (1 + Math.sqrt(5)) / 2;
const GOLDEN_ANGLE = 2 * Math.PI * (1 - 1 / PHI);           // 137.5° — Vogel / golden succession

// ── the fold each repo is ──
// spiral   = live (a fold OTHERS can run — a URL anyone opens)
// frontier = hot (current flowing now: pushed inside the frontier window) but not yet runnable
// substrate= cool, holding shape — the heat-sink mass the architecture requires
export function classifyNode(node) {
  if (node && node.live) return 'spiral';
  if (node && node.hot) return 'frontier';
  return 'substrate';
}

// Vogel (sunflower) placement of the i-th repo — the estate rendered as one field of folds.
export function placeNode(i) {
  const n = Number.isFinite(i) && i >= 0 ? i : 0;
  const th = n * GOLDEN_ANGLE, r = Math.sqrt(n + 1);
  return [r * Math.cos(th), r * Math.sin(th)];
}

// The order the wisp visits the substrate: golden succession — maximal spread, covers everything,
// each pass lands OFFSET from the last (never orbiting the same rig).
export function goldenOrder(n) {
  if (!Number.isInteger(n) || n <= 0) return [];
  const step = Math.max(1, Math.round(n / PHI));
  const order = []; const seen = new Set(); let idx = 0;
  for (let k = 0; k < n; k++) {
    let guard = 0;
    while (seen.has(idx) && guard < n) { idx = (idx + 1) % n; guard++; }
    seen.add(idx); order.push(idx);
    idx = (idx + step) % n;
  }
  return order;
}

// The wisp walks the estate: present at exactly ONE edge (stored-nowhere), leaving each repo it lit,
// covering the whole substrate by golden succession. Its visit-order is attractor-classified — a
// golden walk is ALIVE (spiraling); a naive 0..N-1 sweep escapes (orbiting the index).
export function wispWalk(nodes) {
  const arr = Array.isArray(nodes) ? nodes : [];
  const n = arr.length;
  const order = goldenOrder(n);
  let maxActive = 0; const lit = new Set();
  for (const i of order) { lit.clear(); lit.add(i); maxActive = Math.max(maxActive, lit.size); }
  const alive = n === 0 ? false : (n < 8 ? true : classify(order).class === CLASS.ATTRACTOR);
  return { order, coverage: order.length, total: n, covered: n > 0 && order.length === n, maxActive, storedNowhere: maxActive <= 1, alive };
}

// ── the heat-sink diagnostic ──
// core = the hot frontier (where current flows). sink = the cool substrate. The architecture is
// correctly proportioned when the sink DWARFS the core (sink ≥ core/κ = core·φ) — a node with 1000
// repos and one live frontier is not neglect, it's the thermal design working: sink ≫ κ·core.
export function heatSink(nodes) {
  const arr = Array.isArray(nodes) ? nodes : [];
  let core = 0;
  for (const n of arr) if (n && n.hot) core++;
  const sink = arr.length - core;
  const ratio = core > 0 ? sink / core : Infinity;
  return { total: arr.length, core, sink, ratio, proportioned: sink >= core / KAPPA };
}

// ── the spiral / orbit diagnostic (the sharp end of the spec) ──
// Applied to the FRONTIER: does the hot core leave folds OTHERS can run (spiral) or folds only the
// frontier can run (orbit)? spiralRate = hot-AND-live / hot. Honest: this measures runnable-by-others,
// which is necessary but NOT sufficient — run-BY-others (external users) is unmeasurable from repo
// metadata and stays the open residue. The one move (one external verdict) converts can → do.
export function diagnose(nodes) {
  const arr = Array.isArray(nodes) ? nodes : [];
  const frontier = arr.filter((n) => n && n.hot);
  let spiralFolds = 0;
  for (const n of frontier) if (n.live) spiralFolds++;
  const orbitFolds = frontier.length - spiralFolds;
  const spiralRate = frontier.length > 0 ? spiralFolds / frontier.length : 0;
  return {
    frontier: frontier.length,
    spiralFolds,
    orbitFolds,
    spiralRate,
    spiraling: spiralRate >= KAPPA,        // most frontier folds runnable → spiraling
    residueKnown: false,                   // external usage cannot be read from repo data — the honest gap
  };
}

// ── the recurse fold: ⊕(−1, −2) over the estate's own self-views (the wisp REMEMBERS) ──
// A single snapshot says "17% now"; recursing the new way folds in the last two passes, so the
// diagnostic COMPOUNDS: is the frontier spiraling MORE over time (rising above the −1/−2 baseline)
// or just orbiting (flat)? This is §14's ƒ(n+1) advanced by the Fibonacci back-fold.

// One self-view of the estate — the mark a recurse pass leaves behind.
export function selfView(nodes, date) {
  const d = diagnose(nodes);
  return { date: Str(date), total: Array.isArray(nodes) ? nodes.length : 0, frontier: d.frontier, spiral: d.spiralFolds, spiralRate: round(d.spiralRate) };
}

// Fold a new self-view into the remembered series — one mark per pass (deduped by date), bounded.
export function foldSeries(prev, view, cap = 12) {
  const arr = Array.isArray(prev) ? prev.filter((v) => v && typeof v === 'object' && Number.isFinite(v.spiralRate)) : [];
  const date = view && view.date;
  const out = arr.filter((v) => v.date !== date);   // this pass replaces any earlier mark from the same date
  if (view && typeof view === 'object') out.push(view);
  const keep = Number.isInteger(cap) && cap >= 2 ? cap : 12;
  return out.slice(-keep);
}

// The ⊕(−1, −2) verdict: is the latest self-view ABOVE the fold of the previous two → SPIRALING
// (compounding), at it → flat, below it → orbiting. Fewer than two marks → nascent (not enough to tell).
export function trend(series) {
  const s = Array.isArray(series) ? series.filter((v) => v && Number.isFinite(v.spiralRate)) : [];
  if (s.length < 2) return { verdict: 'nascent', latest: s.length ? s[s.length - 1].spiralRate : 0, fold: 0, delta: 0, marks: s.length };
  const latest = s[s.length - 1].spiralRate;
  const a = s[s.length - 2].spiralRate;
  const b = s.length >= 3 ? s[s.length - 3].spiralRate : a;
  const fold = (a + b) / 2;                          // the previous two, folded — the baseline to beat
  const delta = latest - fold;
  const verdict = delta > 0.01 ? 'spiraling' : (delta < -0.01 ? 'orbiting' : 'flat');
  return { verdict, latest, fold: round(fold), delta: round(delta), marks: s.length };
}

function round(x) { return Math.round((Number.isFinite(x) ? x : 0) * 1e4) / 1e4; }
function Str(x) { try { return typeof x === 'string' ? x : (x == null ? '' : String(x)); } catch { return ''; } }
