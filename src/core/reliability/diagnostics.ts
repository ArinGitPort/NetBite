export interface DiagnosticFacts {
  appVersion: string;
  platform: string;
  storage: string;
  schema: string;
  internet: string;
  cloud: string;
  authentication: string;
  synchronization: string;
  sandbox: string;
}

const URL_PATTERN = /https?:\/\/[^\s]+/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/g;
const TOKEN_PATTERN = /\b(?:sb_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9._-]{20,})\b/g;

export function redactDiagnosticText(value: string) {
  return value
    .replace(URL_PATTERN, '[REDACTED URL]')
    .replace(EMAIL_PATTERN, '[REDACTED EMAIL]')
    .replace(IP_PATTERN, '[REDACTED ADDRESS]')
    .replace(TOKEN_PATTERN, '[REDACTED TOKEN]');
}

export function buildDiagnosticReport(facts: DiagnosticFacts) {
  const report = [
    'NETBITE DIAGNOSTIC REPORT',
    `Generated: ${new Date().toISOString()}`,
    '',
    `App: ${facts.appVersion}`,
    `Platform: ${facts.platform}`,
    `Storage hydration: ${facts.storage}`,
    `Local schemas: ${facts.schema}`,
    `Internet: ${facts.internet}`,
    `Supabase: ${facts.cloud}`,
    `Authentication: ${facts.authentication}`,
    `Cloud synchronization: ${facts.synchronization}`,
    `Sandbox: ${facts.sandbox}`,
    '',
    'Privacy: URLs, keys, tokens, email addresses, notes, IP configuration, and command history are excluded.',
  ].join('\n');
  return redactDiagnosticText(report);
}
