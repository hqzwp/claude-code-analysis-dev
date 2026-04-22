import fs from 'node:fs/promises';
import path from 'node:path';
import type { ToolCallResult, ToolDefinition } from './types.js';

type GrepInput = {
  pattern: string;
  path?: string;
  caseInsensitive?: boolean;
  maxResults?: number;
};

const DEFAULT_MAX_RESULTS = 50;
const MAX_RESULTS_CAP = 200;
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'dist']);
const MAX_FILE_BYTES = 1_000_000;

function resolveSafePath(inputPath?: string): string {
  const root = process.cwd();
  const resolved = path.resolve(root, inputPath ?? '.');

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Path escapes current working directory.');
  }

  return resolved;
}

function isLikelyBinary(text: string): boolean {
  return text.includes('\u0000');
}

function parseGrepInput(input: unknown): GrepInput | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const payload = input as Partial<GrepInput>;
  if (typeof payload.pattern !== 'string') {
    return null;
  }

  return payload as GrepInput;
}

async function walkFiles(
  directory: string,
  onFile: (filePath: string) => Promise<boolean>,
): Promise<boolean> {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      const shouldStop = await walkFiles(fullPath, onFile);
      if (shouldStop) {
        return true;
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const shouldStop = await onFile(fullPath);
    if (shouldStop) {
      return true;
    }
  }

  return false;
}

export function createGrepTool(): ToolDefinition {
  return {
    name: 'grep',
    description: 'Search text in project files with a regular expression.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression pattern to search for.' },
        path: { type: 'string', description: 'Optional subdirectory path to search.' },
        caseInsensitive: { type: 'boolean', description: 'Set true for case-insensitive search.' },
        maxResults: { type: 'integer', minimum: 1, maximum: MAX_RESULTS_CAP, description: 'Maximum matches to return.' },
      },
      required: ['pattern'],
      additionalProperties: false,
    },
    async execute(input: unknown): Promise<ToolCallResult> {
      const parsed = parseGrepInput(input);
      if (!parsed || parsed.pattern.trim().length === 0) {
        return { isError: true, content: 'grep requires a non-empty pattern.' };
      }

      const root = resolveSafePath(parsed.path);
      const flags = parsed.caseInsensitive ? 'i' : '';
      const regex = new RegExp(parsed.pattern, flags);
      const maxResultsRaw = Number.isFinite(parsed.maxResults)
        ? Math.trunc(parsed.maxResults ?? DEFAULT_MAX_RESULTS)
        : DEFAULT_MAX_RESULTS;
      const maxResults = Math.min(MAX_RESULTS_CAP, Math.max(1, maxResultsRaw));
      const results: string[] = [];

      await walkFiles(root, async (filePath) => {
        let stat;
        try {
          stat = await fs.stat(filePath);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return false;
          }
          throw error;
        }

        if (stat.size > MAX_FILE_BYTES) {
          return false;
        }

        let source;
        try {
          source = await fs.readFile(filePath, 'utf8');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return false;
          }
          throw error;
        }

        if (isLikelyBinary(source)) {
          return false;
        }

        const lines = source.split(/\r?\n/);
        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index];
          regex.lastIndex = 0;
          if (regex.test(line)) {
            results.push(`${path.relative(process.cwd(), filePath)}:${index + 1}: ${line}`);
          }

          if (results.length >= maxResults) {
            return true;
          }
        }

        return false;
      });

      if (results.length === 0) {
        return { content: 'No matches found.' };
      }

      return {
        content: results.join('\n'),
      };
    },
  };
}
