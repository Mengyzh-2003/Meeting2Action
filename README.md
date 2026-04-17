# Meeting2Action

Meeting2Action（会易达）是一款面向科研与研发团队的 AI 项目管理系统，定位为虚拟项目经理。系统将会议中的语音或文本自动转化为结构化任务，完成任务提取、分发、跟踪与可视化管理，帮助团队提升执行效率与协作透明度。

## 1. 项目目标

Meeting2Action 的核心流程是：

1. 输入会议录音、文字纪要或实时转写内容。
2. 通过 AI 解析会议中的行动项、负责人、截止时间和优先级。
3. 将结构化任务自动分发给团队成员。
4. 通过可视化看板跟踪任务状态、风险和推进节奏。

结合当前产品定位，项目结构需要同时支持以下能力：

1. 会议内容接入与结构化处理。
2. AI 语义解析与 actionItems 数据标准统一。
3. 自动化任务分发与通知。
4. 极简可视化看板展示与协作。
5. 后续的日志、测试、部署与接口扩展。

## 2. 推荐项目结构

当前仓库已按以下结构完成第一版骨架设计：

```text
Meeting2Action/
├─ README.md
├─ apps/
│  ├─ web/
│  │  └─ src/
│  ├─ api/
│  │  └─ src/
│  └─ worker/
│     └─ src/
├─ packages/
│  └─ shared/
│     └─ src/
│        ├─ schemas/
│        └─ types/
├─ docs/
│  ├─ product/
│  └─ api/
├─ scripts/
└─ tests/
```

这是一个适合持续扩展的单仓多模块结构，优点是：

1. 前端、后端、异步任务能力彼此分离，便于并行开发。
2. 共享的数据结构可以集中维护，避免前后端字段不一致。
3. 后续接入语音转写、消息通知、模型服务时，扩展成本更低。

## 3. 目录与功能说明

### 3.1 根目录

#### README.md

项目总说明文档，建议持续维护以下内容：

1. 产品定位与核心功能。
2. 项目结构说明。
3. 开发规范与启动方式。
4. 模块分工和迭代计划。

### 3.2 apps

`apps` 用于存放可独立运行的业务应用。

#### apps/web

前端应用，负责 Meeting2Action 的用户界面，建议承担以下功能：

1. 会议上传页面：上传录音、文本纪要、会议摘要。
2. 任务结果页：展示 AI 提取出的行动项与负责人。
3. 任务看板页：按待办、进行中、已完成等状态展示任务。
4. 任务详情页：查看任务来源、责任人、截止时间、风险说明。
5. 成员视图：按人员查看当前任务负载与逾期情况。

建议后续在 `apps/web/src` 中继续细分：

```text
apps/web/src/
├─ app/                # 页面路由或页面入口
├─ components/         # 通用界面组件
├─ features/           # 业务模块，如 meeting、task、board
├─ services/           # 请求封装与接口调用
├─ hooks/              # 前端复用逻辑
├─ styles/             # 全局样式与主题
└─ utils/              # 前端工具函数
```

#### apps/api

后端应用，负责核心业务逻辑和对外接口，建议承担以下功能：

1. 接收会议文本、转写结果或上传文件。
2. 调用 AI 解析服务，生成标准化 actionItems。
3. 管理任务、成员、项目和看板状态。
4. 提供任务分发、修改、查询和统计接口。
5. 对接通知渠道，如邮件、企业微信、飞书或钉钉。

建议后续在 `apps/api/src` 中细分：

```text
apps/api/src/
├─ modules/
│  ├─ meeting/         # 会议接入、纪要存储、原始记录管理
│  ├─ task/            # 任务创建、更新、状态流转
│  ├─ assignment/      # 自动分发策略、负责人匹配
│  ├─ board/           # 看板聚合与统计接口
│  ├─ member/          # 成员信息、角色、负载统计
│  └─ notification/    # 通知发送与消息模板
├─ integrations/       # 外部服务接入，如 ASR、LLM、消息平台
├─ common/             # 中间件、异常处理、日志、配置
└─ main.*              # 服务启动入口
```

#### apps/worker

异步任务应用，负责耗时流程和后台处理，建议承担以下功能：

1. 批量会议解析。
2. 大模型调用后的异步落库。
3. 自动提醒与定时催办。
4. 周报、任务统计、风险预警生成。
5. 长耗时文件处理，如录音转文本。

建议后续在 `apps/worker/src` 中细分：

```text
apps/worker/src/
├─ jobs/               # 异步任务定义
├─ queues/             # 队列注册与消费逻辑
├─ schedulers/         # 定时任务
├─ handlers/           # 后台处理器
└─ utils/              # Worker 工具函数
```

### 3.3 packages

`packages` 用于存放多应用共享的代码。

#### packages/shared

共享模块，建议作为整个项目的数据标准层，尤其适合维护 AI 输出结构。该目录非常关键，因为它能统一前端、后端和 AI 模块之间的数据契约。

建议承担以下内容：

1. actionItems 的 JSON Schema。
2. 任务、成员、会议、看板卡片的 Type 定义。
3. 通用状态枚举，如任务状态、优先级、风险等级。
4. 日期、文本清洗、字段映射等工具方法。

建议后续在 `packages/shared/src` 中细分：

```text
packages/shared/src/
├─ schemas/
│  ├─ action-item.schema.*   # AI 解析后的行动项标准结构
│  ├─ meeting.schema.*       # 会议数据结构
│  └─ task.schema.*          # 任务数据结构
├─ types/
│  ├─ meeting.*              # 会议类型定义
│  ├─ task.*                 # 任务类型定义
│  ├─ member.*               # 成员类型定义
│  └─ board.*                # 看板类型定义
└─ utils/
	├─ date.*                 # 日期处理
	├─ text.*                 # 文本规范化
	└─ mapping.*              # 字段转换与兼容处理
```

### 3.4 docs

`docs` 用于存放非代码文档，方便团队协作和答辩展示。

#### docs/product

产品侧文档，建议包含：

1. 产品需求文档。
2. 用户流程图。
3. 页面原型说明。
4. 核心业务规则和角色权限。

#### docs/api

接口与数据文档，建议包含：

1. 接口清单。
2. 请求与响应示例。
3. actionItems 字段定义。
4. 前后端联调约定。

当前已补充：

- [docs/api/action-items-schema.md](docs/api/action-items-schema.md)：行动项结构定义
- [docs/api/action-items-fields.md](docs/api/action-items-fields.md)：行动项字段说明
- [docs/api/tasks-table.sql](docs/api/tasks-table.sql)：SQLite 版 tasks 表 SQL
- [docs/api/members-meetings-api.md](docs/api/members-meetings-api.md)：成员与会议接口草图
- [docs/api/seed-sample-data.sql](docs/api/seed-sample-data.sql)：SQLite 测试数据脚本

### 3.5 scripts

`scripts` 用于放置自动化脚本，建议用于：

1. 初始化测试数据。
2. 导入会议样本。
3. 本地开发环境启动辅助。
4. 批量数据清洗或迁移。

### 3.6 tests

`tests` 用于测试用例和测试资源，建议包含：

1. AI 解析结果样例测试。
2. actionItems schema 校验测试。
3. 任务分发逻辑测试。
4. 看板统计接口测试。
5. 端到端业务流程测试。

## 4. 与当前业务模块的对应关系

结合你当前的开发重点，这套结构与模块职责可以这样对应：

1. 模块 2：AI 语义深度解析
	- 主要落在 `apps/api` 的 `meeting`、`integrations` 模块。
	- 数据标准统一落在 `packages/shared/src/schemas`。

2. 模块 3：自动化任务分发
	- 主要落在 `apps/api` 的 `assignment` 模块。
	- 定时提醒和异步通知落在 `apps/worker`。

3. 模块 4：极简可视化看板
	- 前端页面落在 `apps/web`。
	- 看板聚合接口落在 `apps/api` 的 `board` 模块。

## 5. 建议优先创建的关键文件

与 A 组当前负责的模块 3-4 对应的前后端与数据库框架图，见 [docs/product/module-3-4-architecture.md](docs/product/module-3-4-architecture.md)。

为了让后续开发更顺畅，建议优先补齐以下文件：

```text
apps/api/src/modules/task/task.controller.ts
apps/api/src/modules/task/task.service.ts
apps/api/src/modules/assignment/assignment.service.ts
apps/web/src/features/task/task-board.tsx
apps/web/src/features/meeting/meeting-upload.tsx
packages/shared/src/schemas/action-item.schema.ts
packages/shared/src/types/task.ts
docs/api/action-items.md
docs/product/user-flow.md
```

这些文件分别对应：

1. 任务接口层。
2. 任务业务逻辑层。
3. 自动分发核心逻辑。
4. 可视化看板界面。
5. 会议内容上传入口。
6. AI 输出结构标准。
7. 通用任务类型定义。
8. 联调文档与产品流程文档。

## 6. 当前仓库状态

当前已完成：

1. 创建了第一版目录骨架。
2. 明确了前端、后端、异步处理、共享数据层和文档层的职责。
3. 将目录与功能说明整理到 README，便于后续直接按模块推进开发。
4. 补充了 actionItems 的共享类型、schema 以及 SQLite 版 tasks 表 SQL。
5. 已创建本地 SQLite 数据库文件 `data/meeting2action.db`，并成功建成 `tasks`、`members`、`meetings`、`meeting_participants` 表。
6. 已补充 members、meetings 共享类型和成员/会议接口草图。
7. 已建成 `task_activity_logs` 表，并写入第一批任务活动日志样例。
8. 已导入第一批本地测试数据，可直接用于接口开发和页面联调。

如果下一步开始真正编码，建议先从 `packages/shared` 中的 actionItems schema 和 `apps/api` 中的任务接口开始，因为这两部分会决定前后端联调效率和后续模块扩展成本。
