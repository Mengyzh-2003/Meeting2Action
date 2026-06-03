# 会易达 OS（Meeting2Action）

> AI Agent 驱动型项目管理 OS，面向科研组会与研发团队协作的本地化 MVP。

会易达把原本碎片化、口语化的会议共识，转成可落库、可追踪、可持续流转的任务与协作数据，让组会真正进入“解析 - 分发 - 执行 - 追踪”的闭环。

---

## 产品定位

会易达不是单纯的会议记录工具，而是把会议内容继续推进到任务执行层的轻量项目管理系统。当前核心链路为：

```text
会议纪要 -> AI / 规则解析 -> 结构化行动项 -> 任务导入 -> 看板追踪 -> 会议与成员协同
```

---

## 当前已实现功能

### 1. 智能信息捕获与解析

- 支持粘贴会议纪要文本、上传文本文件（.txt / .md / .json / .csv）
- 支持 auto、llm、heuristic 三种解析模式
- 当配置 Anthropic 或 OpenAI 环境变量时优先调用大模型
- 当没有可用 API key 时自动回退到规则引擎，不阻塞系统运行
- 解析记录支持保存、列表查询、单条查看、删除、再次导入

### 2. 任务导入与工作台

- 支持将 actionItems 批量导入任务库
- 支持手动创建任务
- 支持任务列表查询、详情查看、状态更新、负责人更新、截止日期更新、删除
- 支持关键词搜索、排序，以及后端分页参数 page / pageSize
- 支持任务活动记录查询
- 支持看板聚合数据和统计数据查询

### 3. 极简可视化看板

- 三栏 Kanban：To Do / Doing / Done
- 风险、负责人、状态等维度筛选
- 任务详情抽屉编辑
- 看板统计区与近期任务展示

### 4. 成员与会议管理

- 成员支持新增 / 查询 / 编辑 / 删除
- 成员字段当前为姓名、studentId、degreeType
- 新增成员时自动生成 6 位初始密码，接口只在创建成功当次返回
- 会议支持新增 / 查询 / 编辑 / 删除
- 支持维护参会成员关系
- 支持通过腾讯会议协议快捷拉起会议

### 5. 登录与本地会话

- 新增独立全屏登录页
- 支持用户名（当前使用成员姓名）+ 密码登录
- 登录后前端可恢复本地会话
- 后端提供登录、登出、当前用户接口
- 写操作已接入登录校验
- 当系统中还没有成员时，可在登录页直接创建首位成员并自动登录

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | TypeScript + esbuild + 原生 HTML / CSS |
| 后端 | Node.js 原生 HTTP + TypeScript |
| 数据库 | SQLite（node:sqlite） |
| AI 集成 | Anthropic SDK + OpenAI 兼容调用 + Heuristic 规则引擎 |
| 项目结构 | Monorepo，共享类型位于 packages/shared |

---

## 目录结构

```text
Meeting2Action/
├─ apps/
│  ├─ api/
│  │  └─ src/modules/
│  │     ├─ auth/
│  │     ├─ intake/
│  │     ├─ task/
│  │     ├─ member/
│  │     └─ meeting/
│  ├─ web/
│  └─ worker/                # 预留，当前未落地
├─ packages/
│  └─ shared/
├─ data/
│  └─ meeting2action.db
├─ docs/
│  ├─ api/
│  └─ product/
├─ scripts/
│  └─ start-dev.cmd
└─ README.md
```

---

## 快速开始

### 环境要求

- Node.js 22+
- npm 10+

### 方式 A：Windows 一键启动

```bat
scripts\start-dev.cmd
```

脚本会自动安装依赖、启动 API 和 Web 服务，并在浏览器中打开页面。

### 方式 B：手动启动

```bash
npm install
npm run dev:api
npm run dev:web
```

### 首次进入系统

如果数据库中还没有成员，进入登录页后会自动切换到“创建首位成员”模式：

- 输入姓名、studentId、培养层次
- 系统生成 6 位初始密码
- 创建完成后自动登录

### 登录方式

- 用户名：当前为成员姓名
- 密码：创建成员时系统生成的 6 位初始密码

### AI 解析环境变量

```bash
ANTHROPIC_API_KEY=xxx npm run dev:api
OPENAI_API_KEY=xxx npm run dev:api
```

访问地址：

- Web：http://127.0.0.1:3000
- API：http://127.0.0.1:3001
- 健康检查：GET /health

---

## 后端 API 总览

### 健康检查

```text
GET /health
```

### 认证与会话

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/users/me
```

### 会议纪要解析

```text
POST   /api/meeting-intakes/parse
POST   /api/meeting-intakes/:id/import-to-board
GET    /api/meeting-intakes
GET    /api/meeting-intakes/:id
DELETE /api/meeting-intakes/:id
```

### 任务与看板

```text
POST   /api/tasks
POST   /api/tasks/import-from-action-items
GET    /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
GET    /api/tasks/:id/activity
GET    /api/board
GET    /api/board/stats
```

### 成员

```text
GET    /api/members/status
GET    /api/members
GET    /api/members/:id
POST   /api/members
PATCH  /api/members/:id
DELETE /api/members/:id
```

### 会议

```text
GET    /api/meetings
GET    /api/meetings/:id
GET    /api/meetings/:id/participants
POST   /api/meetings
PATCH  /api/meetings/:id
PATCH  /api/meetings/:id/participants
DELETE /api/meetings/:id
```

说明：

- 登录相关接口和受保护接口支持 Bearer token，也兼容 X-Session-Token
- 当前写操作默认需要登录
- 成员列表与成员详情当前也要求登录
- 创建成员有一个特例：当系统还没有任何成员时，允许匿名创建首位成员

---

## 常用命令

```bash
npm run dev:api
npm run dev:web
npm run build:web
npm run check:api
```

---

## 文档索引

| 文档 | 说明 |
|---|---|
| docs/api/intake-api.md | 会议纪要解析与导入接口说明 |
| docs/api/members-meetings-api.md | 成员、会议、参会人接口说明 |
| docs/api/action-items-fields.md | ActionItem 字段规范 |
| docs/api/action-items-schema.md | ActionItem JSON Schema |
| docs/api/tasks-table.sql | 当前 SQLite 核心 schema |
| docs/product/module-3-4-architecture.md | 模块 3-4 当前架构说明 |
| docs/product/supplement-current-status.md | 基于当前代码整理的现状补充说明 |

---

## 当前限制与后续优先项

| 项目 | 当前状态 |
|---|---|
| 登录模型 | 已有本地账号与会话，但仍是轻量单团队模型，无角色与细粒度权限 |
| 用户名规则 | 当前登录用户名使用成员姓名，studentId 已入库但暂未作为登录主键 |
| 密码管理 | 已有初始密码生成与校验，但无重置密码、修改密码能力 |
| 任务规模化管理 | 已有搜索、排序、分页参数，但前端仍缺完整分页与批量操作 |
| 负责人关系 | 已补 owner_member_id，但仍保留 ownerName 文本回退逻辑 |
| Worker 异步能力 | apps/worker 仍为预留目录，逾期提醒 / 周报未落地 |
| 自动化测试 | 尚未建立系统化测试 |
| 会议输入源 | 当前仍以文本和文本文件为主，未接入录音转写 |

---

## 当前阶段结论

当前的 Meeting2Action 已经是一个可运行、可持久化、具备登录会话、能完成“会议解析 -> 任务导入 -> 看板追踪 -> 成员会议协同”闭环的 MVP。

如果目标是课程项目、答辩演示或本地原型展示，它已经具备完整主体能力。

如果目标是更正式的产品化版本，下一步应优先补强：

1. 权限模型与账号管理
2. 测试与可靠性
3. 任务规模化管理能力
4. Worker 自动化能力