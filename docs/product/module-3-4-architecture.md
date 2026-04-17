# 模块 3-4 前后端与数据库框架图（当前实现版）

本文档聚焦 A 组当前负责的两部分能力：

- 模块 3：自动化任务分发系统
- 模块 4：极简可视化看板

这里默认模块 2 已经输出统一的数据结构 `actionItems`，模块 3 和模块 4 围绕这份结构化数据继续完成任务生成、落库、展示和流转。

## 1. 总体职责划分

### 前端 Web（已实现）

- 导入确认页：确认结构化行动项后导入
- 看板页：按状态展示任务并支持筛选
- 任务详情页：支持负责人切换、状态流转、截止时间滚轮编辑
- 统计面板：展示总任务数、状态分布、风险分布

### 后端 API（已实现）

- 接收 `actionItems`
- 将 `actionItems` 转换为内部 `tasks`
- 提供任务、成员、会议相关接口
- 提供看板聚合与统计接口
- 提供任务活动记录接口
- 为后续提醒、周报等能力预留扩展点

### 数据库（已实现）

- 持久化会议、任务、成员、任务操作记录
- 支撑看板查询、状态流转和统计分析

## 2. 前后端总体框架图

```mermaid
flowchart LR
    A[模块2 AI解析结果\nactionItems JSON] --> B[前端导入确认页\nImport Review]
    B --> C[后端任务导入接口\nPOST /api/tasks/import-from-action-items]
    C --> D[任务分发服务\nAssignment Service]
    D --> E[(SQLite)]

    E --> F[任务查询接口\nGET /api/tasks]
    E --> G[看板聚合接口\nGET /api/board]
    E --> H[统计接口\nGET /api/board/stats]

    F --> I[前端任务列表 / 看板页]
    G --> I
    H --> J[前端统计面板 / 周报摘要]

    I --> K[任务详情弹窗]
    I --> L[状态流转操作\nPATCH /api/tasks/:id]
    L --> E

    E --> M[Worker 定时任务\n逾期检查 / 周报生成]
    M --> N[提醒中心 / 站内消息]
```

## 3. 模块分层图

```mermaid
flowchart TD
    subgraph Frontend[前端 apps/web]
        A1[导入确认页]
        A2[任务看板页]
        A3[任务详情抽屉]
        A4[统计面板]
        A5[任务服务层 taskService]
    end

    subgraph Backend[后端 apps/api]
        B1[Task Controller]
        B2[Board Controller]
        B3[Assignment Service]
        B4[Task Service]
        B5[Board Service]
        B6[Shared Schema Validator]
    end

    subgraph DB[数据库]
        C1[(meetings)]
        C2[(tasks)]
        C3[(members)]
        C4[(task_activity_logs)]
    end

    subgraph Worker[异步任务 apps/worker]
        D1[逾期扫描 Job]
        D2[周报生成 Job]
        D3[提醒发送 Handler]
    end

    A1 --> A5
    A2 --> A5
    A3 --> A5
    A4 --> A5

    A5 --> B1
    A5 --> B2

    B1 --> B6
    B1 --> B3
    B1 --> B4
    B2 --> B5

    B3 --> C2
    B4 --> C2
    B4 --> C4
    B5 --> C2
    B5 --> C3
    B4 --> C1

    D1 --> C2
    D2 --> C2
    D2 --> C4
    D3 --> C3
```

## 4. 数据流图

```mermaid
sequenceDiagram
    participant AI as 模块2 AI解析
    participant Web as 前端导入确认页
    participant API as 后端导入接口
    participant Service as Assignment Service
    participant DB as 数据库
    participant Board as 看板页

    AI->>Web: 返回 actionItems JSON
    Web->>Web: 用户确认负责人、截止时间、优先级
    Web->>API: 提交 actionItems
    API->>Service: 校验并转换为 tasks
    Service->>DB: 写入 tasks
    DB-->>API: 返回入库结果
    API-->>Web: 返回任务列表
    Web->>API: 请求看板数据
    API->>DB: 查询任务与统计
    DB-->>API: 返回聚合结果
    API-->>Board: 返回 todo/doing/done 数据
```

## 5. 数据库实体关系图

```mermaid
erDiagram
    MEETINGS ||--o{ TASKS : generates
    MEMBERS ||--o{ TASKS : owns
    TASKS ||--o{ TASK_ACTIVITY_LOGS : records

    MEETINGS {
        string id PK
        string topic
        string meeting_time
        string location
        datetime created_at
        datetime updated_at
    }

    MEMBERS {
        string id PK
        string name
        string grade
        string degree_type
        datetime created_at
        datetime updated_at
    }

    TASKS {
        string id PK
        string meeting_id FK
        string owner_name
        string title
        text description
        string priority
        string status
        date due_date
        text acceptance_criteria
        text source_text
        decimal confidence
        datetime created_at
        datetime updated_at
    }

    TASK_ACTIVITY_LOGS {
        string id PK
        string task_id FK
        string action_type
        text action_detail
        string operator_name
        datetime created_at
    }
```

## 6. 你负责的 3-4 模块具体落点

### 模块 3：自动化任务分发系统

你要负责的核心不是“提醒插件”，而是把 `actionItems` 稳定转成系统任务：

- 接收模块 2 的结构化输出
- 提供任务导入确认页
- 提供任务导入接口
- 完成 `actionItems -> tasks` 字段映射
- 保存任务到数据库
- 支持修改负责人、截止时间、优先级和状态

对应代码落点建议：

- `apps/web/src/features/task/import-review`
- `apps/api/src/modules/task`
- `apps/api/src/modules/assignment`

### 模块 4：极简可视化看板

你要负责的是让任务可以被看见、被管理、被追踪：

- 三列看板 To Do / Doing / Done
- 任务详情抽屉
- 状态流转
- 顶部统计区
- 简版周报摘要

对应代码落点建议：

- `apps/web/src/features/board`
- `apps/web/src/features/task`
- `apps/api/src/modules/board`

## 7. 最小接口清单

建议优先实现这 4 个接口：

```text
POST   /api/tasks/import-from-action-items
GET    /api/tasks
PATCH  /api/tasks/:id
GET    /api/board
```

如果时间允许，再补：

```text
GET    /api/board/stats
GET    /api/tasks/:id
```

## 8. 数据库表（当前）

当前已建成并使用以下核心表：

- `tasks`
- `members`
- `meetings`
- `meeting_participants`
- `task_activity_logs`

数据库文件位于 `data/meeting2action.db`。

## 9. 下一阶段推荐顺序

1. 补后端数据约束与错误码规范（成员同名、输入校验）。
2. 补任务搜索/排序/手动创建。
3. 推进看板过滤后端下推。
4. 最后补周报与提醒等加分项。

这样做的原因很直接：

- 任务先落库，系统骨架就立住了。
- 看板是最容易展示价值的页面。
- 统计和周报属于加分项，适合最后补。