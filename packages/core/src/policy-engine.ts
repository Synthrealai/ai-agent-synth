import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { parse as yamlParse } from 'yaml';
import { createChildLogger, PolicyDeniedError, type RiskLevel } from '@forgeclaw/shared';

const log = createChildLogger('policy-engine');

interface PolicyRule {
  id: string;
  action: 'allow' | 'deny' | 'warn' | 'require_approval';
  tool_pattern: string;
  arg_patterns?: Record<string, string>;
  risk_threshold?: number;
  description: string;
}

interface PolicyConfig {
  rules: PolicyRule[];
  risk_thresholds: {
    auto_approve_below: number;
    always_require_above: number;
  };
}

export class PolicyEngine {
  private config: PolicyConfig;

  constructor(configPath?: string) {
    const path = this.resolveConfigPath(configPath);
    const raw = readFileSync(path, 'utf-8');
    this.config = yamlParse(raw) as PolicyConfig;
    log.info({ rules: this.config.rules.length, path }, 'Policy engine loaded');
  }

  private resolveConfigPath(explicitPath?: string): string {
    const candidates = [
      explicitPath,
      resolve(process.cwd(), 'configs/policies.yaml'),
      resolve(process.cwd(), '../configs/policies.yaml'),
      resolve(process.cwd(), '../../configs/policies.yaml'),
      resolve(process.cwd(), '../../../configs/policies.yaml'),
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      `Unable to locate policies.yaml. Checked: ${candidates.join(', ')}`
    );
  }

  evaluate(tool: string, args: Record<string, unknown>, riskLevel: RiskLevel): {
    action: 'allow' | 'deny' | 'warn' | 'require_approval';
    matchedRule?: PolicyRule;
    reason: string;
  } {
    for (const rule of this.config.rules) {
      if (!new RegExp(rule.tool_pattern).test(tool)) continue;

      let argsMatch = true;
      if (rule.arg_patterns) {
        for (const [key, pattern] of Object.entries(rule.arg_patterns)) {
          const argValue = String(args[key] || '');
          if (!new RegExp(pattern).test(argValue)) {
            argsMatch = false;
            break;
          }
        }
      }

      if (argsMatch) {
        log.info({ rule: rule.id, tool, action: rule.action }, 'Policy rule matched');

        if (rule.action === 'deny') {
          throw new PolicyDeniedError(tool, rule.description);
        }

        return {
          action: rule.action,
          matchedRule: rule,
          reason: rule.description,
        };
      }
    }

    if (riskLevel >= this.config.risk_thresholds.always_require_above) {
      return { action: 'require_approval', reason: `Risk level ${riskLevel} exceeds threshold` };
    }

    if (riskLevel < this.config.risk_thresholds.auto_approve_below) {
      return { action: 'allow', reason: 'Low risk, auto-approved' };
    }

    return { action: 'warn', reason: `Medium risk level ${riskLevel}` };
  }
}
