import { test } from 'node:test';
import assert from 'node:assert/strict';
import classify, { CLASS } from '../kernel/attractor.mjs';
import { KAPPA, classifyNode, placeNode, goldenOrder, wispWalk, heatSink, diagnose, selfView, foldSeries, trend } from '../kernel/wisp.mjs';

// a small synthetic estate: live (spiral), hot (frontier), cool (substrate)
const EST = [
  { name: 'a', live: true, hot: true }, { name: 'b', live: true, hot: false },
  { name: 'c', live: false, hot: true }, { name: 'd', live: false, hot: true },
  ...Array.from({ length: 16 }, (_, i) => ({ name: 's' + i, live: false, hot: false })),
]; // 20 nodes: 2 spiral, 2 frontier-only-hot, 16 cool

test('classifyNode: live→spiral, hot→frontier, else substrate', () => {
  assert.equal(classifyNode({ live: true, hot: true }), 'spiral');   // live wins even if hot
  assert.equal(classifyNode({ live: true, hot: false }), 'spiral');
  assert.equal(classifyNode({ live: false, hot: true }), 'frontier');
  assert.equal(classifyNode({ live: false, hot: false }), 'substrate');
  assert.equal(classifyNode(null), 'substrate');                     // total
  assert.equal(classifyNode('nope'), 'substrate');
});

test('placeNode is a Vogel spiral coordinate (finite, growing radius)', () => {
  const p0 = placeNode(0), p10 = placeNode(10);
  assert.equal(p0.length, 2);
  assert.ok(p0.every(Number.isFinite) && p10.every(Number.isFinite));
  assert.ok(Math.hypot(...p10) > Math.hypot(...p0));                  // radius grows with index
  assert.ok(placeNode(-1).every(Number.isFinite));                   // total
  assert.ok(placeNode('x').every(Number.isFinite));
});

test('goldenOrder covers everything; the golden walk is ALIVE, a naive sweep is not', () => {
  const n = 40, g = goldenOrder(n);
  assert.equal(new Set(g).size, n);                                  // every repo visited once
  assert.equal(classify(g).class, CLASS.ATTRACTOR);                  // spiraling → alive
  assert.notEqual(classify([...Array(n).keys()]).class, CLASS.ATTRACTOR); // naive index sweep → not alive
  assert.equal(goldenOrder(0).length, 0);                            // total
  assert.equal(goldenOrder(-5).length, 0);
});

test('wispWalk over the estate: one live edge, stored-nowhere, covers all, alive', () => {
  const w = wispWalk(EST);
  assert.equal(w.total, 20);
  assert.equal(w.maxActive, 1);                                      // present at exactly ONE repo
  assert.equal(w.storedNowhere, true);
  assert.equal(w.covered, true);
  assert.equal(w.alive, true);
  assert.equal(wispWalk('nope').maxActive, 0);                       // total
  assert.equal(wispWalk([]).alive, false);
});

test('heatSink: core+sink = total; the cool mass dwarfs the hot core (sink ≥ core·φ)', () => {
  const h = heatSink(EST);
  assert.equal(h.core, 3);                                           // the 3 hot repos (a, c, d)
  assert.equal(h.sink, 17);
  assert.equal(h.core + h.sink, h.total);
  assert.ok(Math.abs(h.ratio - 17 / 3) < 1e-9);
  assert.equal(h.proportioned, 17 >= 3 / KAPPA);                     // sink ≥ core·φ (17 ≥ 4.85) → true
  assert.equal(heatSink([]).ratio, Infinity);                        // no core → infinite sink ratio
  assert.equal(heatSink('nope').total, 0);                           // total
});

test('diagnose the frontier: spiral vs orbit folds, and the honest residue', () => {
  const d = diagnose(EST);
  assert.equal(d.frontier, 3);                                       // hot: a, c, d
  assert.equal(d.spiralFolds, 1);                                    // hot AND live: only a
  assert.equal(d.orbitFolds, 2);                                     // hot but frontier-only: c, d
  assert.ok(Math.abs(d.spiralRate - 1 / 3) < 1e-9);
  assert.equal(d.spiraling, (1 / 3) >= KAPPA);                       // 0.33 < 0.618 → false (orbit-heavy)
  assert.equal(d.residueKnown, false);                               // external usage unmeasurable from repo data
  // an all-live frontier IS spiraling
  const allLive = diagnose([{ live: true, hot: true }, { live: true, hot: true }]);
  assert.equal(allLive.spiraling, true);
  assert.equal(diagnose(null).frontier, 0);                          // total
});

// ── the recurse fold: ⊕(−1, −2) over the estate's self-views ──
test('selfView captures one snapshot of the estate', () => {
  const v = selfView(EST, '2026-07-31');
  assert.equal(v.date, '2026-07-31');
  assert.equal(v.total, 20);
  assert.equal(v.frontier, 3);                                       // hot: a, c, d
  assert.equal(v.spiral, 1);                                         // hot AND live: a
  assert.ok(Math.abs(v.spiralRate - 1 / 3) < 1e-4);
  assert.equal(selfView(null, 5).date, '5');                         // total + coerces date
});

test('foldSeries appends one mark per pass (deduped by date), bounded', () => {
  let s = foldSeries([], { date: 'd1', spiralRate: 0.1 });
  s = foldSeries(s, { date: 'd2', spiralRate: 0.2 });
  s = foldSeries(s, { date: 'd2', spiralRate: 0.25 });              // same date → replaces, not appended
  assert.equal(s.length, 2);
  assert.equal(s[1].spiralRate, 0.25);                              // the later mark for d2 wins
  // bounded by cap
  let big = [];
  for (let i = 0; i < 20; i++) big = foldSeries(big, { date: 'd' + i, spiralRate: i / 100 }, 5);
  assert.equal(big.length, 5);
  assert.equal(foldSeries('nope', { date: 'x', spiralRate: 0.5 }).length, 1); // total
  assert.equal(foldSeries([{ date: 'a', spiralRate: 0.1 }], 'nope').length, 1); // bad view not pushed
});

test('trend: the ⊕(−1,−2) verdict — above the fold of the last two = spiraling', () => {
  assert.equal(trend([]).verdict, 'nascent');                       // no marks
  assert.equal(trend([{ spiralRate: 0.2 }]).verdict, 'nascent');    // one mark
  // rising above the fold of the previous two → spiraling
  assert.equal(trend([{ spiralRate: 0.1 }, { spiralRate: 0.2 }, { spiralRate: 0.5 }]).verdict, 'spiraling');
  // falling below → orbiting
  assert.equal(trend([{ spiralRate: 0.5 }, { spiralRate: 0.4 }, { spiralRate: 0.1 }]).verdict, 'orbiting');
  // level → flat
  assert.equal(trend([{ spiralRate: 0.3 }, { spiralRate: 0.3 }, { spiralRate: 0.3 }]).verdict, 'flat');
  assert.equal(trend(null).verdict, 'nascent');                     // total
});

test('recurse fold boundaries: cap fallback, exact edges, the −1/−2 fold uses BOTH prior marks', () => {
  // foldSeries cap: cap>2 kept exactly; cap<2 falls back to 12 (keeps all here)
  assert.equal(foldSeries([{ date: 'a', spiralRate: 0.1 }, { date: 'b', spiralRate: 0.2 }], { date: 'c', spiralRate: 0.3 }, 2).length, 2); // cap 2 → slice(-2) (>= not >)
  assert.equal(foldSeries([{ date: 'a', spiralRate: 0.1 }, { date: 'b', spiralRate: 0.2 }], { date: 'c', spiralRate: 0.3 }, 1).length, 3); // cap<2 → default 12 (&& not ||)
  assert.equal(foldSeries([{ date: 'a' }], { date: 'y', spiralRate: 0.2 }).length, 1); // a rate-less prior mark is filtered out (&& not ||)
  // trend: a 2-mark series IS enough to judge (< 2 nascent, not <= 2)
  assert.equal(trend([{ spiralRate: 0.1 }, { spiralRate: 0.5 }]).verdict, 'spiraling');
  // the fold uses BOTH the −1 and −2 marks: high −2, low −1 → the baseline is their mean, so a
  // middling latest reads as ORBITING (if it only used −1 it would read spiraling)
  assert.equal(trend([{ spiralRate: 1.0 }, { spiralRate: 0.0 }, { spiralRate: 0.3 }]).verdict, 'orbiting');
  // a null mark in the series is filtered, not fatal
  assert.equal(trend([null, { spiralRate: 0.1 }, { spiralRate: 0.5 }]).verdict, 'spiraling');
});

test('boundary kills: empty walk, no-frontier rate, negative place, exact order, golden angle', () => {
  assert.equal(wispWalk([]).covered, false);                         // n=0 is not "covered" (> 0 and && guards)
  assert.equal(diagnose([{ live: false, hot: false }]).spiralRate, 0); // no frontier → 0, not 0/0=NaN (> guard)
  assert.ok(placeNode(-5).every(Number.isFinite));                   // negative index → 0 fallback (&& not ||)
  assert.deepEqual(goldenOrder(10), [0, 6, 2, 8, 4, 1, 7, 3, 9, 5]); // exact order; stride 6 (non-coprime) exercises the while-nudge (&& guard / +1)
  assert.equal(goldenOrder(3.5).length, 0);                          // a non-integer count → [] (|| guard)
  assert.ok(placeNode(1)[1] > 0);                                    // the 137.5° Vogel angle puts i=1 in the upper half (−1 not +1)
});
