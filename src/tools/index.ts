import { createFileReadTool } from './fileReadTool.js';
import { createGrepTool } from './grepTool.js';
import { ToolRegistry } from './registry.js';
import { createDefaultToolPolicy } from '../permissions/index.js';

export { ToolRegistry };
export type { ApiToolDefinition, ToolCallResult, ToolDefinition } from './types.js';

export function createDefaultToolRegistry(): ToolRegistry {
  const canUseTool = createDefaultToolPolicy();
  return new ToolRegistry([createFileReadTool(), createGrepTool()], canUseTool);
}
