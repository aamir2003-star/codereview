import { ICustomRule, IRuleContext, IRuleFinding } from '../types';

export const performanceRules: ICustomRule[] = [
  {
    id: 'PERF-001',
    name: 'Synchronous File System in Request Path',
    description: 'Use of fs.*Sync methods blocks the Node.js event loop',
    category: 'performance',
    severity: 'error',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const syncPattern = /\bfs\.(readFileSync|writeFileSync|statSync|existsSync|mkdirSync)\b/;

      for (const line of ctx.lines) {
        if (line.isAddition && syncPattern.test(line.content)) {
          findings.push({
            ruleId: 'PERF-001',
            category: 'performance',
            severity: 'error',
            line: line.number,
            message: 'Synchronous filesystem operation blocks the Node event loop under concurrent load',
            snippet: line.content.trim(),
            suggestedFix: 'Use fs.promises equivalent with async/await',
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'PERF-002',
    name: 'Unindexed Regex Query in Mongoose',
    description: 'Case-insensitive regex queries without prefix anchors trigger full collection scans',
    category: 'performance',
    severity: 'warning',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const queryPattern = /\$regex\s*:\s*(\/[^/]+\/|new\s+RegExp|[a-zA-Z0-9_$.]+)/;

      for (const line of ctx.lines) {
        if (line.isAddition && queryPattern.test(line.content)) {
          findings.push({
            ruleId: 'PERF-002',
            category: 'performance',
            severity: 'warning',
            line: line.number,
            message: 'Unanchored regex query in MongoDB query triggers full table scan',
            snippet: line.content.trim(),
            suggestedFix: 'Use text index ($text: { $search }) or ensure prefix anchor (^)',
          });
        }
      }
      return findings;
    },
  },
];
