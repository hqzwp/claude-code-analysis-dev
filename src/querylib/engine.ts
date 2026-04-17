import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from '../query.js';

/**
 * Build API messages from chat history (exclude system)
 */
export function buildApiMessages(history: ChatMessage[]): Anthropic.MessageParam[] {
  return history.flatMap((message) => {
    if (message.role === 'system') {
      return [];
    }
    return [{ role: message.role, content: message.text }];
  });
}

/**
 * Extract text blocks from response content
 */
export function getTextBlocks(content: Anthropic.Message['content']): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/**
 * Extract tool use blocks from response content
 */
export function getToolUseBlocks(content: Anthropic.Message['content']): Anthropic.ToolUseBlock[] {
  return content.filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
}

/**
 * Serialize error to safe object for logging
 */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error && typeof error === 'object') {
    const o = error as Record<string, unknown>;
    const out: Record<string, unknown> = {
      name: typeof o.name === 'string' ? o.name : 'Error',
      message: typeof o.message === 'string' ? o.message : String(error),
    };
    if (typeof o.status === 'number') {
      out.status = o.status;
    }
    if (o.headers !== undefined) {
      out.headers = o.headers;
    }
    if (o.error !== undefined) {
      out.error = o.error;
    }
    if (o.body !== undefined) {
      out.body = o.body;
    }
    if (o.request_id !== undefined) {
      out.request_id = o.request_id;
    }
    return out;
  }
  return { message: String(error) };
}

/**
 * Deep clone via JSON (safe for API payloads)
 */
export function jsonSafeClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
