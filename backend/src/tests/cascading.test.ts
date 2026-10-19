import { ruleEngine } from '../rules/engine';
import { bundleAnalyzer } from '../storage/bundle-analyzer.service';
import { IRuleFinding } from '../rules/types';

async function runCascadingTests() {
  console.log('--- [Test] Running Cascading Scenarios & Boundary Edge Cases ---');

  // Test 1: Rule Engine on AST edge cases
  const sampleDiff = `
@@ -1,5 +1,10 @@
+const query = req.query.search;
+const regex = new RegExp(query, 'i');
+const output = eval('2 + 2');
+files.forEach(async (f) => {
+  await process(f);
+});
`;

  const findings = ruleEngine.evaluateFile('test.controller.ts', sampleDiff);
  console.log(`[Rule Engine] Detected ${findings.length} findings from unified diff sample`);
  findings.forEach((f: IRuleFinding) => console.log(` - [${f.ruleId}] ${f.category} (${f.severity}): ${f.message}`));

  if (findings.length >= 3) {
    console.log('✅ AST Rule Engine detected multiple critical flaws in sample diff');
  } else {
    console.error('❌ Rule Engine missed anticipated flaws');
  }

  // Test 2: Bundle Analyzer Zero Division boundary
  const diff = bundleAnalyzer.analyzeBundleDiff({ totalBytes: 0 }, { totalBytes: 150000 });
  console.log(`[Bundle Diff] Percent change on 0 base size: ${diff.percentChange}%`);
  if (!isNaN(diff.percentChange) && isFinite(diff.percentChange)) {
    console.log('✅ Zero base size handled safely without NaN or Infinity');
  } else {
    console.error('❌ Bundle Analyzer returned NaN or Infinity');
  }

  console.log('--- Cascading suite completed ---');
  process.exit(0);
}

runCascadingTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
