import { ICustomRule, IRuleContext, IRuleFinding } from '../types';

export const securityRules: ICustomRule[] = [
  {
    id: 'SEC-001',
    name: 'Disallow Unsafe Eval',
    description: 'Direct use of eval() or new Function() allows arbitrary code execution',
    category: 'security',
    severity: 'error',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const pattern = /\b(eval|new\s+Function)\s*\(/;

      for (const line of ctx.lines) {
        if (line.isAddition && pattern.test(line.content)) {
          findings.push({
            ruleId: 'SEC-001',
            category: 'security',
            severity: 'error',
            line: line.number,
            message: 'Potentially dangerous code execution detected with eval() or new Function()',
            snippet: line.content.trim(),
            suggestedFix: '// Use safe deserialization or parser alternatives instead of eval',
          });
        }
      }
      return findings;
    },
  },
  {
    id: 'SEC-002',
    name: 'Unescaped RegExp Injection',
    description: 'Dynamic RegExp creation with user input allows ReDoS vulnerabilities',
    category: 'security',
    severity: 'error',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const pattern = /new\s+RegExp\s*\(\s*([a-zA-Z0-9_$.]+)\s*(?:,\s*['"`][gimsuy]*['"`])?\s*\)/;

      for (const line of ctx.lines) {
        if (line.isAddition) {
          const match = pattern.exec(line.content);
          if (match && !match[1].startsWith('"') && !match[1].startsWith("'") && !match[1].startsWith('`')) {
            findings.push({
              ruleId: 'SEC-002',
              category: 'security',
              severity: 'error',
              line: line.number,
              message: `Unsanitized variable '${match[1]}' passed to RegExp constructor can lead to ReDoS`,
              snippet: line.content.trim(),
              suggestedFix: `new RegExp(escapeRegExp(${match[1]}))`,
            });
          }
        }
      }
      return findings;
    },
  },
  {
    id: 'SEC-003',
    name: 'Dangerous HTML Injection',
    description: 'Direct assignment to dangerouslySetInnerHTML or innerHTML allows XSS',
    category: 'security',
    severity: 'error',
    enabled: true,
    check: (ctx: IRuleContext): IRuleFinding[] => {
      const findings: IRuleFinding[] = [];
      const pattern = /(dangerouslySetInnerHTML|innerHTML)\s*=/;

      for (const line of ctx.lines) {
        if (line.isAddition && pattern.test(line.content)) {
          findings.push({
            ruleId: 'SEC-003',
            category: 'security',
            severity: 'error',
            line: line.number,
            message: 'Direct assignment to raw HTML property enables Cross-Site Scripting (XSS)',
            snippet: line.content.trim(),
            suggestedFix: 'Use sanitized text rendering or DOMPurify before assigning raw HTML',
          });
        }
      }
      return findings;
    },
  },
];
