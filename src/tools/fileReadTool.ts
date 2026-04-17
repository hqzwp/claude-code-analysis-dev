import fs from 'node:fs/promises';
import path from 'node:path';
import type { ToolCallResult, ToolDefinition } from './types.js';

type FileReadInput = {
  path: string;
  offset?: number;
  limit?: number;
};

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
//安全路径解析
function resolveSafePath(inputPath: string): string {
  const root = process.cwd();
  const resolved = path.resolve(root, inputPath);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Path escapes current working directory.');
  }
  return resolved;
}

function parseFileReadInput(input: unknown): FileReadInput | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const payload = input as Partial<FileReadInput>;
  if (typeof payload.path !== 'string') {
    return null;
  }

  return payload as FileReadInput;
}

export function createFileReadTool(): ToolDefinition {
  return {
    name: 'file_read',
    description: 'Read a text file from the current project directory.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to current working directory.' },
        offset: { type: 'integer', minimum: 0, description: 'Start line number offset (0-indexed).' },
        limit: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, description: 'Max lines to read.' },
      },
      required: ['path'],
      additionalProperties: false,
    },
    async execute(input: unknown): Promise<ToolCallResult> {
      const parsed = parseFileReadInput(input);
      if (!parsed || parsed.path.trim().length === 0) {
        return { isError: true, content: 'file_read requires a non-empty path.' };
      }

      const targetPath = resolveSafePath(parsed.path);
      const stat = await fs.stat(targetPath);
      if (!stat.isFile()) {
        return { isError: true, content: `Not a file: ${parsed.path}` };
      }

      const source = await fs.readFile(targetPath, 'utf8');
      const lines = source.split(/\r?\n/);
      const offset = Math.max(0, Number.isFinite(parsed.offset) ? Math.trunc(parsed.offset ?? 0) : 0);
      const requestedLimit = Number.isFinite(parsed.limit) ? Math.trunc(parsed.limit ?? DEFAULT_LIMIT) : DEFAULT_LIMIT;
      const limit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));
      const selected = lines.slice(offset, offset + limit);

      if (selected.length === 0) {
        return { content: `(empty result) ${parsed.path}` };
      }

      const numbered = selected
        .map((line, index) => `${String(offset + index + 1).padStart(6)}\t${line}`)
        .join('\n');

      return {
        content: `File: ${path.relative(process.cwd(), targetPath)}\n${numbered}`,
      };
    },
  };
}
