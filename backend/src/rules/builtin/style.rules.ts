import { ICustomRule, IRuleContext, IRuleFinding } from '../types';

export const styleRules: ICustomRule[] = [
  {
    id: 'STY-001',
    name: 'Hardcoded Secret Tokens',
    description: 'Detects hardcoded JWT secrets, API tokens, and private keys in code diffs',
    category: 'security',
    severity: 'error',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const secretPattern = /(secret|apiKey|api_key|password|jwtSecret)\s*[:=]\s*['"][a-zA-Z0-9_\-!@#$%^&*]{8,}['"]/i;

      for (const line of ctx.lines) {
        if (line.isAddition && secretPattern.test(line.content)) {
          findings.push({
            ruleId: 'STY-001',
            category: 'security',
            severity: 'error',
            line: line.number,
            message: 'Potential secret or credential hardcoded directly in source file',
            snippet: line.content.trim(),
            suggestedFix: 'Load secret securely via process.env',
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'STY-002',
    name: 'Console Log in Production Service',
    description: 'Direct console.log statements pollute production log aggregators',
    category: 'style',
    severity: 'info',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const consolePattern = /\bconsole\.(log|debug)\s*\(/;

      for (const line of ctx.lines) {
        if (line.isAddition && consolePattern.test(line.content)) {
          findings.push({
            ruleId: 'STY-002',
            category: 'style',
            severity: 'info',
            line: line.number,
            message: 'Direct console.log should be replaced with structured logger (winston/pino)',
            snippet: line.content.trim(),
            suggestedFix: 'Use structured logger logger.info(...)',
          });
        }
      }
      return findings;
    },
  },
];
