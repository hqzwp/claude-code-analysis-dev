# mini-claude-cli

这是一个用于学习 Claude Code 架构的小型 CLI 项目，整体变更应尽量保持“小步迭代、单点学习”。

## 本地 memory

项目记忆放在：

- `.claude/memory/MEMORY.md`
- `.claude/memory/user_learning_goal.md`
- `.claude/memory/mini_cli_version_progression.md`

## skills 约定

- skill 文件放在 `.claude/skills/`
- skill 使用 `.md` 文件
- skill 元数据写在 frontmatter，正文作为 prompt 模板

## 学习方式

- 优先对齐 Claude Code 的模块边界，再做最小可用实现
- 每个版本只解决一个明确主题
- 尽量保留简单、可读、可测试的结构
