# FlowMind AI：从会议记录到知识资产的 AI 产品案例

## 一句话概述

FlowMind AI 面向需要频繁协作的产品、研发与项目团队，将会议内容转化为结构化结论、可管理行动项和可检索的历史知识，并在 Copilot 回答中展示本次请求的来源依据。

## 产品背景

团队会议通常完成了“讨论”，却没有完成“沉淀”。录音难以回听，结论散落在不同工具中，行动项缺少归属，数周后的类似问题只能依赖成员记忆重新讨论。

我将问题定义为两条连续链路：

1. **会议结束后的执行断点**：共识无法稳定转为决策、任务和风险跟踪。
2. **跨会议的知识断点**：历史讨论不能被可靠检索，AI 回答也缺少可追溯依据。

因此，FlowMind AI 的设计目标不是生成一份“更好的纪要”，而是构建受权限保护的会议知识工作流。

## 目标用户与场景

| 用户       | 场景                           | 需要的结果                                 |
| ---------- | ------------------------------ | ------------------------------------------ |
| 产品经理   | 产品规划会后确认范围与验收标准 | 从讨论中得到明确决策和待办。               |
| 项目经理   | 跨团队风险跟踪                 | 快速找到风险何时提出、由谁跟进。           |
| 工程负责人 | 技术评审与上线前回顾           | 检索历史技术约束和上线风险，避免重复验证。 |
| 团队成员   | 会后补齐上下文                 | 基于会议与来源获得可验证回答。             |

## AI Workflow

```text
录音上传
  -> 服务端转录
  -> transcript / segments
  -> Meeting Intelligence
  -> summary / key_points / decisions / action_items / risks
  -> 行动项管理与 Copilot 问答
```

### 产品设计要点

- **结构化而不是自由文本**：Meeting Intelligence 的结果用 Zod 校验，确保摘要、决策、行动项和风险可被产品界面稳定消费。
- **异步且可恢复**：转录、智能分析和知识处理各自使用既有任务生命周期，具有 claim、lease、失败安全码和 retry 机制。
- **安全可理解**：失败不把 Provider 原始错误、录音、完整转录或 API Key 暴露到用户界面或数据表。

## RAG 架构

```text
Transcript
  -> 约 1200 字符 chunks（约 200 字符 overlap）
  -> metadata: speaker / timestamp / source_hash
  -> 1536-dimensional embedding
  -> pgvector HNSW index
  -> owner-scoped similarity RPC
  -> Meeting Copilot context
  -> answer + temporary sources
```

### 为什么这样设计

1. **分块先于检索**：会议通常较长；带 overlap 的 chunk 在保留上下文的同时控制检索粒度。
2. **检索与回答分层**：`retrieveMeetingContext()` 负责向量化问题和检索，Context Builder 负责把当前会议和历史片段组装为 Copilot 上下文。
3. **来源不持久化**：来源只随当前 Server Action 返回。刷新或重新进入会议后，只显示 role/content 消息，避免把瞬态检索结果误认为历史事实。
4. **安全回退优先**：空知识库或检索失败会返回空 chunks，Copilot 仍可基于当前会议工作；界面明确展示知识库不可用，不伪造引用或 similarity。

## 权限与隐私设计

- 认证和已有 RLS 不改动；核心表和知识表都以 `auth.uid() = user_id` 为用户所有权边界。
- 向量检索 RPC 内部再次强制 owner filter，并限制 top-k 最大值，不返回 embedding 或内部字段。
- owner-scoped meeting metadata 查询仅读取 `id`、`title` 和 `meeting_date`，用于当前响应的来源展示。
- API Key 仅存在服务器端环境变量；浏览器获得的只有 Supabase 公共配置。
- Usage Event 记录 provider、模型、操作、成功/失败、延迟和可用 token 元数据，不记录 prompt、完整会议内容、原始错误或 API Key。

## Reliability Analytics

FlowMind AI 基于 `ai_usage_events` 增加只读可靠性分析层，输出：

- provider、model identifier 与 operation type 的调用次数；
- 成功率与安全 failure code 分类；
- 延迟统计；
- 为未来 token/cost 聚合预留字段与度量方式。

该层不影响 AI 调用链、不写入新事件、不改变 RLS，目的是让 AI 功能具备可观察、可解释的运营基础。

## 关键技术决策

| 决策                                     | 取舍与理由                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| DeepSeek Chat 与 Embedding Provider 分离 | 聊天模型和 embedding 模型的可用性、维度与成本并不相同，避免把单一供应商假设固化到知识库。      |
| 固定 `vector(1536)`                      | 保持既有索引和 RPC 合约稳定；真实 embedding provider 必须兼容该维度。                          |
| Mock embedding 仅用于 Demo               | 可以稳定演示 fixture 与回退体验，但不能宣称为生产语义检索。                                    |
| 结构化输出 Zod 校验                      | 优先保护后续 UI、任务创建和数据契约，而不是直接信任模型 JSON。                                 |
| worker claim + lease                     | 防止多个 worker 重复处理同一任务，并支持 lease 到期恢复。                                      |
| 临时来源引用                             | 让用户理解当前回答的依据，同时避免修改消息 schema 或持久化不稳定检索结果。                     |
| 合成中文评估集                           | 不依赖客户数据即可验证 retrieval relevance、空知识库、错误上下文拒绝和 Provider failure 回退。 |

## 可演示成果

- 叙事式 Landing Page：产品价值 -> AI Workflow -> Demo 会议 -> Copilot -> 来源引用。
- 受控 fixture runner：`seed`、`verify`、`reset` 可在本地或 Preview 环境重复执行。
- RAG A/B：有索引时展示当前响应的来源；无索引或失败时显示明确 fallback。
- 端到端质量门禁：Vitest、ESLint、TypeScript、Next.js build，以及 migration/RLS/worker/Provider contract tests。

## 当前限制与下一步

当前 Demo 以合成数据和 Mock embedding 保持稳定；生产语义 RAG 需要配置真实、受批准且兼容 1536 维的 embedding provider，并以离线评估集和线上指标验证质量。该限制在 Demo 与部署文档中明确记录，不把“可展示”混同为“已完成生产规模验证”。

## 展示建议

按 [2-3 分钟 Demo 演示脚本](flowmind-ai-demo-script.md) 讲解：先说明会议后的执行与知识断点，再展示一次会议的结构化结果，随后提问历史风险并展示来源，最后切换到知识库不可用回退，说明安全与产品诚实性。
