import type { CommandHandler } from './types.js';

/**
 * Built-in slash commands
 */
export const builtins: Record<string, CommandHandler> = {
  /**
   * /help - show available commands
   */
  help: () => ({
    kind: 'append_assistant',
    text: 'Commands: /help, /clear, /exit. Tools: file_read, grep. Model: qwen3.5-plus. q exits on empty input.',
  }),

  /**
   * /clear - reset conversation history
   */
  clear: () => ({
    kind: 'reset_messages',
  }),

  /**
   * /exit - quit the application
   */
  exit: () => ({
    kind: 'exit',
  }),
};
