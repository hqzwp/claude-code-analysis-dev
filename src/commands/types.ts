/**
 * Command execution context - lightweight, UI-agnostic
 */
export type CommandContext = {
  exit: () => void;
};

/**
 * Result types for command dispatcher
 */
/**
 * 命令分发器（dispatcher）的返回值类型：**可辨识联合（discriminated union）**。
 *
 * - **核心字段 `kind`**：用来区分具体是哪一种结果；调用方通常用 `switch (result.kind)` 分支处理。
 * - **为什么这么设计**：相比 “返回 string | null” 这类松散返回值，这种写法能让 TypeScript 在不同分支里推导出
 *   精确类型（例如只在 `append_assistant` / `submit_prompt` 分支里才有 `text` 字段），减少 if/空值判断错误。
 *
 * 各分支语义：
 * - **`not_command`**：输入不是 slash 命令（例如不以 `/` 开头），dispatcher 不处理，交给后续聊天/skill 路由流程。
 * - **`append_assistant`**：命令直接产出一段要展示给用户的 assistant 文本（同步结果），无需调用模型。
 * - **`submit_prompt`**：命令把输入转换成一个“要提交给模型的 prompt”（例如展开成更具体的提示词），后续应走流式调用模型。
 * - **`reset_messages`**：命令要求清空/重置当前会话消息（回到初始 messages）。
 * - **`exit`**：命令要求退出程序（调用方应触发 `ctx.exit()` 或等价逻辑）。
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
export type CommandHandler = (ctx: CommandContext, args: string[]) => CommandResult | Promise<CommandResult>;
