---
name: mini-claude-cli 版本演进
description: 用户用 mini-claude-cli 的 V2→V5 逐版本迭代记录 Claude Code 学习过程
type: project
---

mini-claude-cli 是用户用来学习 Claude Code 的分阶段项目，按版本逐步演进：
- V2：最小可运行基线，先理解 CLI 主流程
- V3：补 CLAUDE.md、中文 README、测试与 VS Code 调试，整理学习与排障入口
- V4：加入 skills 概念，提供 /skills 和 /skill 的显式入口与 registry
- V5：把 skills 从硬编码过渡到 skills/ 文件目录 + loader + 模板渲染

**Why:** 用户希望通过持续的小步版本更新来对照 Claude Code 的架构，而不是一次性做大改造。

**How to apply:** 后续讨论新版本时，优先沿用“基线 → 文档/测试 → skills → 文件化加载”的学习路径，并保持每版目标单一、变更最小。
