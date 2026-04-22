/**
 * Command execution context - lightweight, UI-agnostic
 */
export type CommandContext = {
  exit: () => void;
};

/**
 * Result types for command dispatcher
 */
export type CommandResult =
  | { kind: 'not_command' }
  | { kind: 'append_assistant'; text: string }
  | { kind: 'submit_prompt'; text: string }
  | { kind: 'reset_messages' }
  | { kind: 'exit' };

/**
 * Built-in command handler signature
 */
export type CommandHandler = (ctx: CommandContext, args: string[]) => CommandResult;
