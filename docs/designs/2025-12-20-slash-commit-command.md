# Slash Commit Command

**Date:** 2025-12-20

## Context

用户期望在 `src/slash-commands/builtin/` 下新增一个 `/commit` 内置命令，复用 `src/nodeBridge.ts:2406-2451` 中的 commit message 生成提示词。核心需求是将该提示词抽取为独立函数，支持传入 `language` 和 `formatting` 参数，使其可复用且可配置。

## Discussion

### 命令类型选择
- **prompt 类型**: 类似 `/review`，生成提示词让 AI 执行 commit 流程 ✅ 用户选择
- **local-jsx 类型**: 复用现有 CommitUI 组件，在聊天中渲染交互式界面
- **local 类型**: 直接调用 nodeBridge 生成 commit message 并返回文本结果

用户选择 prompt 类型，因为它更轻量且符合 slash command 的交互模式。

### formatting 参数定义
用户澄清 `formatting` 是指最后返回的 JSON 格式，期望能在外部声明指定，而非 commit message 本身的格式。

### 提示词函数位置
- **新建 prompts 目录**: 抽取函数到独立目录如 `src/prompts/generateCommit.ts`
- **utils 目录**: 放在 `src/utils/` 下作为工具函数 ✅ 用户选择

### 设计方案
- **方案 A (简洁函数式)**: 使用简单接口，`formatting` 为完整字符串模板 ✅ 用户选择
- **方案 B (结构化配置)**: 使用结构化对象配置字段和示例

用户选择方案 A，优先简洁性和最小改动。

## Approach

采用简洁函数式抽取方案：
1. 将 `createGenerateCommitSystemPrompt` 抽取到 `src/utils/commitPrompt.ts`
2. 函数接受可选的 `CommitPromptOptions` 对象，支持 `language` 和 `formatting` 参数
3. `nodeBridge.ts` 改用新函数，保持向后兼容
4. 新建 `/commit` 命令作为 prompt 类型，类似现有的 `/review` 命令

## Architecture

### 文件结构
```
src/utils/commitPrompt.ts           # 新建 - 抽取的 prompt 生成函数
src/slash-commands/builtin/commit.ts    # 新建 - /commit 命令
src/slash-commands/builtin/index.ts     # 修改 - 注册命令
src/nodeBridge.ts                   # 修改 - 改用新函数
```

### 核心接口
```typescript
// src/utils/commitPrompt.ts
export interface CommitPromptOptions {
  language?: string;      // 输出语言，默认 English
  formatting?: string;    // 自定义返回格式说明，替换默认的 JSON 格式部分
}

export function createGenerateCommitSystemPrompt(options?: CommitPromptOptions): string
```

### 调用流程
1. `/commit` 命令使用 bash 获取 staged diff
2. 使用 `createGenerateCommitSystemPrompt({ language, formatting })` 生成系统提示词
3. AI 分析 diff 并返回 commit 信息

### /commit 命令实现
```typescript
// src/slash-commands/builtin/commit.ts
export function createCommitCommand(language: string): PromptCommand {
  return {
    type: 'prompt',
    name: 'commit',
    description: 'Generate commit message for staged changes',
    progressMessage: 'Generating commit message...',
    async getPromptForCommand(args?: string) {
      // 返回包含系统提示词和获取 diff 指令的 prompt
    },
  };
}
```
