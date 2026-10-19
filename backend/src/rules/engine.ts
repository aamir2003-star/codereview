import { ICustomRule, IRuleContext, IRuleFinding, IPolicyConfig } from './types';
import { securityRules } from './builtin/security.rules';
import { performanceRules } from './builtin/performance.rules';
import { concurrencyRules } from './builtin/concurrency.rules';
import { styleRules } from './builtin/style.rules';

export class RuleEngine {
  private rules: Map<string, ICustomRule> = new Map();

  constructor() {
    this.registerBuiltinRules();
  }

  private registerBuiltinRules(): void {
    const all = [...securityRules, ...performanceRules, ...concurrencyRules, ...styleRules];
    for (const rule of all) {
      this.rules.set(rule.id, rule);
    }
  }

  public registerCustomRule(rule: ICustomRule): void {
    this.rules.set(rule.id, rule);
  }

  public evaluateFile(
    filename: string,
    patch: string,
    policy?: IPolicyConfig
  ): IRuleFinding[] {
    if (!patch) return [];

    const lines = this.parseUnifiedDiff(patch);
    const imports = this.extractImports(lines);

    const context: IRuleContext = {
      filename,
      patch,
      lines,
      imports,
    };

    const findings: IRuleFinding[] = [];

    for (const rule of this.rules.values()) {
      if (policy && policy.rules[rule.id] && !policy.rules[rule.id].enabled) {
        continue;
      }
      if (!rule.enabled) continue;

      if (rule.filePatterns && rule.filePatterns.length > 0) {
        const matches = rule.filePatterns.some((pattern) => new RegExp(pattern).test(filename));
        if (!matches) continue;
      }

      try {
        const ruleFindings = rule.check(context);
        if (policy && policy.rules[rule.id]?.severity) {
          ruleFindings.forEach((f) => (f.severity = policy.rules[rule.id].severity!));
        }
        findings.push(...ruleFindings);
      } catch (err) {
        console.warn(`[RuleEngine] Rule ${rule.id} failed on ${filename}:`, err);
      }
    }

    return findings;
  }

  private parseUnifiedDiff(patch: string): Array<{ number: number; content: string; isAddition: boolean }> {
    const result: Array<{ number: number; content: string; isAddition: boolean }> = [];
    const lines = patch.split('\n');
    let currentLine = 1;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
        if (match) {
          currentLine = parseInt(match[1], 10);
        }
        continue;
      }

      if (line.startsWith('+') && !line.startsWith('+++')) {
        result.push({
          number: currentLine,
          content: line.slice(1),
          isAddition: true,
        });
        currentLine++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        // Deletion, don't advance target line
      } else {
        currentLine++;
      }
    }

    return result;
  }

  private extractImports(lines: Array<{ content: string }>): string[] {
    const imports: string[] = [];
    const importRegex = /import\s+(?:.+?\s+from\s+)?['"]([^'"]+)['"]/;

    for (const line of lines) {
      const match = importRegex.exec(line.content);
      if (match) {
        imports.push(match[1]);
      }
    }
    return imports;
  }

  public getRegisteredRules(): ICustomRule[] {
    return Array.from(this.rules.values());
  }
}

export const ruleEngine = new RuleEngine();
