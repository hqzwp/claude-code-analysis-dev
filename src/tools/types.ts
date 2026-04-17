import type Anthropic from '@anthropic-ai/sdk';

export type ToolCallResult = {
  content: string;
  isError?: boolean;
};
//工具定义
export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Anthropic.Tool.InputSchema;
  execute: (input: unknown) => Promise<ToolCallResult>;
};
//API工具定义
export type ApiToolDefinition = Anthropic.Tool;
