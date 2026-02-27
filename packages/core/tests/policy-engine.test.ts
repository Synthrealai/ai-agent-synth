import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../src/policy-engine.js';
import { RiskLevel } from '@forgeclaw/shared';

describe('PolicyEngine', () => {
  const engine = new PolicyEngine();

  it('should deny rm -rf commands', () => {
    expect(() => {
      engine.evaluate('shell', { command: 'rm -rf /' }, RiskLevel.CRITICAL);
    }).toThrow('Policy denied');
  });

  it('should allow filesystem reads', () => {
    const result = engine.evaluate('filesystem', { action: 'read', path: '/tmp/test.txt' }, RiskLevel.NONE);
    expect(result.action).toBe('allow');
  });

  it('should require approval for file deletion', () => {
    const result = engine.evaluate('filesystem', { action: 'delete', path: '/tmp/test.txt' }, RiskLevel.MEDIUM);
    expect(result.action).toBe('require_approval');
  });

  it('should require approval for social posting', () => {
    const result = engine.evaluate('social', { action: 'post', content: 'test' }, RiskLevel.HIGH);
    expect(result.action).toBe('require_approval');
  });

  it('should allow memory operations', () => {
    const result = engine.evaluate('memory', { action: 'store' }, RiskLevel.NONE);
    expect(result.action).toBe('allow');
  });
});
