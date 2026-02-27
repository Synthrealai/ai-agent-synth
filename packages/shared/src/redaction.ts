const SECRET_PATTERNS = [
  /sk-ant-api\w+/g,
  /sk-proj-\w+/g,
  /sk-or-v1-\w+/g,
  /sk_[a-zA-Z0-9_]+/g,
  /gsk_\w+/g,
  /hf_\w+/g,
  /r8_\w+/g,
  /ghp_\w+/g,
  /AIzaSy\w+/g,
  /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+/g,
  /AAAAAAAAAAAAAAAA\w+/g,
  /Bearer\s+\S+/g,
  /token[=:]\s*\S+/gi,
  /password[=:]\s*\S+/gi,
  /secret[=:]\s*\S+/gi,
];

export function redactSecrets(text: string): string {
  let redacted = text;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

export function redactEnvValue(key: string, value: string): string {
  const sensitiveKeys = ['KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'BEARER'];
  if (sensitiveKeys.some(k => key.toUpperCase().includes(k))) {
    return `${value.slice(0, 8)}...${value.slice(-4)}`;
  }
  return value;
}
