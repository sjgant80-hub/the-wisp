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
