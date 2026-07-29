# FlowMind AI

> 让会议从记录工具变成可持续利用的知识资产。

FlowMind AI 是一个面向团队协作的 AI 会议工作台。它把录音、转录、会议智能分析、行动项和可追溯的 Copilot 问答连接为一条受权限保护的工作流，帮助团队将讨论转化为后续行动和可复用知识。

## 产品定位

FlowMind AI 不是单纯的会议记录工具，而是面向会议后协作的知识与行动系统：

- 将会议讨论整理为摘要、关键决策、行动项与风险。
- 让成员在后续会议中继续检索历史上下文，而不是重新翻找文档。
- 为 Copilot 回答提供当前请求级来源引用，帮助使用者判断答案依据。

## 用户痛点与 AI 方案

| 困难                 | FlowMind AI 的应对方式                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| 录音和长文本难以回顾 | 服务端转录将录音变为带时间片段的会议文本。                                      |
| 结论、责任和风险分散 | Meeting Intelligence 生成摘要、决策、行动项和风险，并通过 Zod 校验结构化结果。  |
| 历史会议难以复用     | 知识库把转录切分为 chunks，向量检索为 Copilot 提供相关历史上下文。              |
| AI 回答缺少依据      | 当前 Copilot 请求返回临时来源引用；没有知识库时明确回退到当前会议上下文。       |
| AI 调用难以运营      | `ai_usage_events` 支持按 provider、模型、操作、成功率和延迟进行只读可靠性分析。 |

## 核心能力

1. **会议与录音管理**：创建会议，上传私有 MP3、WAV、MP4 或 WebM 录音。
2. **自动转录与会议智能**：通过异步 worker 处理转录和结构化分析，状态可追踪、失败可安全重试。
3. **行动项中心**：从 AI 分析结果创建、跟踪并完成行动项。
4. **Meeting Copilot**：围绕当前会议提问；在可用时结合历史知识库上下文回答。
5. **知识库与 RAG**：转录切分、1536 维 embedding 持久化、pgvector 检索、owner-scoped 来源引用。
6. **可靠性与质量评估**：AI 调用可靠性分析、合成中文 RAG 评估集与可重复 Demo fixture。

## 技术架构

```text
Meeting audio
  -> Transcription worker
  -> Transcript + segments
  -> Meeting Intelligence worker -> summary / decisions / action items / risks
  -> Knowledge worker -> chunks -> embeddings -> pgvector retrieval
  -> Meeting Copilot -> current context + retrieved chunks -> answer + temporary sources

AI calls -> ai_usage_events -> reliability analytics
```

**关键边界**

- Next.js 15 App Router、React 19、TypeScript、Tailwind CSS。
- Supabase Auth、PostgreSQL、Storage 与 owner-scoped RLS 是数据访问的最终边界。
- Service-role 仅用于受控 worker 与 Demo fixture 持久化；浏览器不获取 service-role 或 Provider API Key。
- AI Provider 与 Embedding Provider 分离。DeepSeek Chat 可在服务端启用；当前 `EMBEDDING_PROVIDER=mock` 仅用于本地/Preview Demo，不代表生产语义 RAG。
- RAG RPC 强制 `auth.uid()` owner 过滤，不返回 embedding；来源引用仅存在于本次 Copilot 响应，不持久化到消息历史。

更多产品与技术决策见 [项目案例文档](docs/portfolio/flowmind-ai-case-study.md)。

## Demo 使用流程

Landing Page 提供一个静态叙事式导览：产品价值 -> AI Workflow -> Demo 会议 -> Copilot -> 来源引用。完整可运行 Demo 使用专用合成用户和 fixture：

```bash
npm run demo:fixtures:seed
npm run demo:fixtures:verify
```

1. 在本地或 Preview 环境以专用 Demo 用户登录。
2. 打开“产品规划会议”查看摘要、决策、行动项和风险。
3. 向 Copilot 提问历史风险，查看当前响应附带的来源会议、日期与片段。
4. 在没有索引或检索失败的状态下，确认 UI 显示“知识库不可用”，并仅基于当前会议上下文回答。
5. 验证其他用户无法读取 Demo 用户的会议、转录、知识 chunks 或来源。

`seed` 是幂等的；需要重置 Demo 数据时使用 `npm run demo:fixtures:reset`。fixture runner 受 `DEMO_FIXTURES_ENABLED` 和非生产环境保护，不能用于生产数据。

## 本地运行

### 前置条件

- Node.js 20.9+
- npm 10+
- 本地或 Preview Supabase 项目

### 配置

```bash
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`.env.example` 仅包含浏览器安全的 Supabase 公共配置与非敏感 Provider 选择器。API Key 必须仅在服务器环境变量或 Vercel Project Settings 中配置，且禁止使用 `NEXT_PUBLIC_` 前缀。

常用配置：

```text
AI_PROVIDER=deepseek
DEEPSEEK_MODEL=deepseek-chat
EMBEDDING_PROVIDER=mock
```

生产配置、Embedding 边界和 Preview Demo 要求见 [生产 AI 配置说明](docs/qa/sprint-15-production-ai-configuration.md) 与 [Demo QA Runbook](docs/qa/sprint-16-demo-qa.md)。

## 验证命令

| Command                        | Purpose                                      |
| ------------------------------ | -------------------------------------------- |
| `npm test`                     | 运行完整 Vitest 测试集                       |
| `npm run lint`                 | ESLint 零 warning 检查                       |
| `npm run typecheck`            | 严格 TypeScript 检查                         |
| `npm run build`                | Next.js 生产构建                             |
| `npm run demo:fixtures:seed`   | 幂等初始化 Demo fixture                      |
| `npm run demo:fixtures:reset`  | 仅清理 Demo 用户 fixture                     |
| `npm run demo:fixtures:verify` | 验证 fixture、RAG 预期来源与 owner isolation |

## 作品集材料

- [产品与技术案例](docs/portfolio/flowmind-ai-case-study.md)
- [2-3 分钟 Demo 演示脚本](docs/portfolio/flowmind-ai-demo-script.md)
- [AI Reliability Analytics](docs/qa/sprint-17-ai-reliability-analysis.md)
- [RAG Quality Analysis](docs/qa/sprint-17-rag-quality-analysis.md)

## 当前边界

项目保留认证、RLS、worker lifecycle、Provider abstraction 与 RAG retrieval contract 的稳定边界。真实生产语义 RAG 需要配置经批准的、兼容 `vector(1536)` 的 embedding provider；Mock embedding 不能作为生产 RAG 能力宣传。
