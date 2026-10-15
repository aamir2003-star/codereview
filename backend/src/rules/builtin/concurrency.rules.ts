import { ICustomRule, IRuleContext, IRuleFinding } from '../types';

export const concurrencyRules: ICustomRule[] = [
  {
    id: 'CONC-001',
    name: 'Un-awaited Async Callbacks in forEach',
    description: 'Array.prototype.forEach does not wait for async callback promises to resolve',
    category: 'concurrency',
    severity: 'error',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const forEachAsync = /\.forEach\s*\(\s*async\s*\(/;

      for (const line of ctx.lines) {
        if (line.isAddition && forEachAsync.test(line.content)) {
          findings.push({
            ruleId: 'CONC-001',
            category: 'concurrency',
            severity: 'error',
            line: line.number,
            message: 'Array.prototype.forEach does not await asynchronous callbacks; operations run unhandled',
            snippet: line.content.trim(),
            suggestedFix: 'Use for...of loop with await or Promise.all(items.map(async ...))',
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'CONC-002',
    name: 'Shared Mutable Counter in Worker',
    description: 'Post-increment or pre-increment on non-atomic counters in concurrent worker loops',
    category: 'concurrency',
    severity: 'warning',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const incrementInExpr = /[a-zA-Z0-9_$]+\+\+/;

      for (const line of ctx.lines) {
        if (line.isAddition && incrementInExpr.test(line.content) && line.content.includes('/') || line.content.includes('*')) {
          findings.push({
            ruleId: 'CONC-002',
            category: 'concurrency',
            severity: 'warning',
            line: line.number,
            message: 'Post-increment operator used inside arithmetic calculation evaluates to stale value',
            snippet: line.content.trim(),
            suggestedFix: 'Increment counter on a separate line before or after the calculation',
          });
        }
      }
      return findings;
    },
  },
];
