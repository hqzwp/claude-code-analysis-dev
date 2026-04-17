import fs from 'node:fs';

/**
 * One .log file (newline-delimited JSON per line) for UI debug and LLM traffic.
 * Prefer MINI_CLAUDE_LOG; MINI_CLAUDE_LLM_LOG is still read for backward compatibility.
 */
export function getDefaultLogPath(): string {
  return (
    process.env.MINI_CLAUDE_LOG?.trim() ||
    process.env.MINI_CLAUDE_LLM_LOG?.trim() ||
    '/tmp/mini-claude-cli.log'
  );
}

export function appendLogRecord(record: Record<string, unknown>, logPath?: string): void {
  const path = logPath?.trim() || getDefaultLogPath();
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n';
    fs.appendFileSync(path, line, 'utf8');
  } catch {
    // never break the app on logging failure
  }
}

export function logDebug(message: string, logPath?: string): void {
  appendLogRecord({ kind: 'ui_debug', message }, logPath);
}
