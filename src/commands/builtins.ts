import type { CommandHandler } from './types.js';
import { listSkills, buildSkillPrompt } from '../skills/index.js';

/**
 * Built-in slash commands
 */
export const builtins: Record<string, CommandHandler> = {
  /**
   * /help - show available commands
   */
  help: () => ({
    kind: 'append_assistant',
    text: 'Commands: /help, /clear, /exit, /skills, /skill <name> [args...]. Tools: file_read, grep. Model: qwen3.5-plus. q exits on empty input.',
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

  /**
   * /skills - list available skills
   */
  skills: () => ({
    kind: 'append_assistant',
    text: listSkills()
      .map((skill) => `/${skill.name} [${skill.source}] - ${skill.description}${skill.usage ? ` (${skill.usage})` : ''}`)
      .join('\n') || 'No skills available.',
  }),

  /**
   * /skill <name> [args...] - build a prompt from a skill
   */
  skill: (_ctx, args) => {
    const [name, ...skillArgs] = args;
    if (!name) {
      return {
        kind: 'append_assistant',
        text: 'Usage: /skill <name> [args...]',
      };
    }

    const prompt = buildSkillPrompt(name, skillArgs);
    if (!prompt) {
      return {
        kind: 'append_assistant',
        text: `Unknown skill: ${name}. Type /skills to list available skills.`,
      };
    }

    return {
      kind: 'submit_prompt',
      text: prompt,
    };
  },
};
