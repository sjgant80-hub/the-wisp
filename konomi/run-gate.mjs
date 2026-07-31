// run-gate.mjs — proof-of-play for the wisp-over-the-estate. Mutation-gates wisp.mjs and fuzzes
// every function — no malformed node list may crash it. attractor is the vendored, already-gated organ.
import { runMutations, fuzz } from './witness.mjs';
import * as wisp from '../kernel/wisp.mjs';

const TEST = ['node', '--test', 'test/wisp.test.mjs'];
let clean = true;

console.log('── mutation gate (kernel/wisp.mjs) ─────');
const r = runMutations('kernel/wisp.mjs', { testCmd: TEST });
if (r.baselineFailed) { console.log('  BASELINE RED —', r.reason); clean = false; }
else {
  const ig = r.ignored.length ? ` (+${r.ignored.length} baselined)` : '';
  console.log(`  kernel/wisp.mjs: ${r.killed}/${r.total} killed  score=${r.score}${ig}  ${r.clean ? 'CLEAN' : 'THEATRE'}`);
  for (const s of r.survived) console.log(`     SURVIVED L${s.line}  ${s.mutation}  | ${s.snippet}`);
  clean = clean && r.clean;
}

console.log('\n── fuzz gate (no malformed node list may crash the wisp) ──');
for (const [name, fn] of Object.entries({
  'classifyNode': (x) => wisp.classifyNode(x),
  'placeNode':    (x) => wisp.placeNode(x),
  'goldenOrder':  (x) => wisp.goldenOrder(x),
  'wispWalk':     (x) => wisp.wispWalk(x),
  'heatSink':     (x) => wisp.heatSink(x),
  'diagnose':     (x) => wisp.diagnose(x),
  'selfView':     (x) => wisp.selfView(x, x),
  'foldSeries':   (x) => wisp.foldSeries(x, x),
  'trend':        (x) => wisp.trend(x),
})) {
  const f = await fuzz(fn);
  console.log(`  ${name}: ${f.neverThrows ? 'never throws — OK' : 'THREW on ' + f.throwsOn.map((t) => t.input).join(', ')}`);
  clean = clean && f.neverThrows;
}

console.log(clean ? '\n=== ALL CLEAN ===' : '\n=== SURVIVORS / THROWS REMAIN ===');
process.exit(clean ? 0 : 1);
