export type RuleSeverity = 'error' | 'warning' | 'info';
export type RuleCategory = 'security' | 'performance' | 'concurrency' | 'style' | 'correctness';

export interface IRuleContext {
  filename: string;
  patch: string;
  lines: Array<{ number: number; content: string; isAddition: boolean }>;
  options?: Record<string, any>;
  imports: string[];
}

export interface IRuleFinding {
  ruleId: string;
  category: RuleCategory;
  severity: RuleSeverity;
  line: number;
  message: string;
  snippet?: string;
  suggestedFix?: string;
}

export interface ICustomRule {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  enabled: boolean;
  filePatterns?: string[];
  check: (context: IRuleContext) => IRuleFinding[];
}

export interface IPolicyConfig {
  organizationId: string;
  rules: Record<string, { enabled: boolean; severity?: RuleSeverity; options?: Record<string, any> }>;
  excludePaths: string[];
  maxViolationsAllowed: number;
}
