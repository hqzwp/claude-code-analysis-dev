import { builtins } from './builtins.js';
import type { CommandResult, CommandContext } from './types.js';

/**
 * Dispatch a slash command line to the appropriate handler.
 * Returns CommandResult; caller applies state mutations.
 */
export function dispatchCommand(
  input: string,
  ctx: CommandContext
): CommandResult {
  const trimmed = input.trim();

  // Must start with /
  if (!trimmed.startsWith('/')) {
    return { kind: 'not_command' };
  }

  // Extract command name (first token after /)
  const parts = trimmed.slice(1).split(/\s+/);
  const cmdName = parts[0].toLowerCase();

  const handler = builtins[cmdName];
  if (!handler) {
    return {
      kind: 'append_assistant',
      text: `Unknown command: /${cmdName}. Type /help for available commands.`,
    };
  }

  return handler(ctx);
}
