# 会易达 OS（Meeting2Action）

> **AI Agent 驱动型项目管理 OS，专为科研与研发团队设计的虚拟项目经理。**

会易达将原本碎片化、口语化的会议共识，自动转化为可量化、可追踪的工程任务，让每一场组会都真正成为生产力落地的起点。

---

## 产品定位

会易达不是单纯的会议记录工具，而是跨越"语义理解"与"任务执行"之间鸿沟的 AI 项目管理系统。核心价值链：

```
会议纪要 → AI 语义解析 → 结构化行动项 → 看板任务 → 团队执行追踪
```

---

## 已实现功能

### 阶段一：智能信息捕获（Intake Stage）

- **多模式输入**：支持粘贴会议纪要文本、上传文本文件（`.txt` / `.md` / `.json`）
- **解析模式选择**：Auto（自动选最优引擎）/ LLM（强制调 AI）/ Heuristic（纯规则）
- **解析历史管理**：记录每次解析结果，支持重新加载和删除
- **解析中状态反馈**：按钮 loading 动画 + 实时引擎标识（如「✦ Claude Sonnet」）

### 阶段二：AI 语义深度解析（Intelligence Stage）

解析引擎按优先级自动降级：

| 引擎 | 条件 | 能力 |
|---|---|---|
| **Claude LLM**（默认） | 配置 `ANTHROPIC_API_KEY` | 深度语义理解，自动识别责任人/截止时间/优先级/验收标准，相对日期换算 |
| **OpenAI LLM** | 配置 `OPENAI_API_KEY` | 同上，结构化 JSON schema 输出 |
| **Heuristic 规则引擎** | 兜底，无需 API | 关键词触发，支持中文日期推断，无需网络 |

每条行动项自动提取：**任务标题、描述、责任人、截止日期、优先级、验收标准、来源原文、置信度、标签**。

### 阶段三：任务分发与导入（Execution Stage）

- **导入确认页**：解析结果可逐条编辑（标题、责任人下拉选人、截止日期、优先级），确认后一键导入
- **责任人成员库联动**：下拉选人显示成员彩色头像，与成员管理模块实时同步
- **AI 已识别字段自动预填**：置信度高的字段直接填入，降低人工录入成本
- **一键导入看板**：确认后批量写入任务数据库，自动跳转看板

### 阶段四：可视化看板（Visualization Stage）

- **三栏 Kanban**：待办（To Do）/ 进行中（Doing）/ 已完成（Done）
- **多维筛选**：按状态、负责人、风险等级独立过滤，支持组合筛选
- **任务详情抽屉**：右侧滑出，支持负责人切换、截止时间滚轮调整，自动保存
- **任务溯源**：每条任务保留来源原文（`sourceText`），可追溯至原始会议语句
- **统计面板**：总任务数、进行中、逾期、高优先级等看板数据

### 团队与会议管理

- **成员管理**：新增 / 查询 / 编辑 / 删除，支持姓名搜索，表格视图
- **会议管理**：新增（含日期时间选择器）/ 查询 / 编辑 / 删除
- **参会人管理**：会议创建时选人，也可事后独立维护
- **一键拉起腾讯会议**：每个会议卡片内置「🎥 腾讯会议」按钮，触发 `wemeet://` 协议

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | TypeScript + esbuild + 原生 HTML/CSS（Apple 风格 UI） |
| 后端 | Node.js 原生 HTTP（无框架）+ TypeScript |
| 数据库 | SQLite（`node:sqlite`，Node.js 22 内置） |
| AI 集成 | Anthropic SDK（`@anthropic-ai/sdk`），支持 Claude / OpenAI / 规则引擎 |
| 项目结构 | Monorepo，共享类型包 `packages/shared` |

---

## 目录结构

```text
Meeting2Action/
├─ apps/
│  ├─ api/               # 后端服务（127.0.0.1:3001）
│  │  └─ src/modules/    # task / board / member / meeting / intake
│  ├─ web/               # 前端页面（127.0.0.1:3000）
│  └─ worker/            # 预留（异步任务/提醒）
├─ packages/
│  └─ shared/            # 共享类型定义与 JSON Schema
├─ data/
│  └─ meeting2action.db  # SQLite 数据库文件
├─ docs/
│  ├─ api/               # 后端接口文档
│  └─ product/           # 产品架构文档
├─ scripts/
│  └─ start-dev.cmd      # Windows 一键启动脚本
└─ package.json
```

---

## 快速开始

### 环境要求

- Node.js 22+（内置 `node:sqlite`）
- npm 10+

### 方式 A：一键启动（Windows）

```bat
scripts\start-dev.cmd
```

脚本自动安装依赖、启动 API 和 Web 服务、打开浏览器。

### 方式 B：手动启动

```bash
npm install
# 终端 1
npm run dev:api
# 终端 2
npm run dev:web
```

### 启用 AI 解析

```bash
# 使用 Claude（推荐）
ANTHROPIC_API_KEY=sk-ant-xxx npm run dev:api

# 使用代理服务
ANTHROPIC_AUTH_TOKEN=your-token npm run dev:api
```

访问地址：

- **Web 前端**：`http://127.0.0.1:3000`
- **API 服务**：`http://127.0.0.1:3001`
- **健康检查**：`GET http://127.0.0.1:3001/health`

---

## 后端 API 总览

### 健康检查
```
GET  /health
```

### 会议解析（Intake）
```
POST   /api/meeting-intakes/parse                   # 解析会议纪要
POST   /api/meeting-intakes/:id/import-to-board     # 导入看板
GET    /api/meeting-intakes                         # 查询解析记录列表
GET    /api/meeting-intakes/:id                     # 查询单条记录
DELETE /api/meeting-intakes/:id                     # 删除记录
```

### 任务与看板（Task / Board）
```
POST   /api/tasks/import-from-action-items          # 批量导入行动项
GET    /api/tasks                                   # 查询任务列表
GET    /api/tasks/:id                               # 查询任务详情
PATCH  /api/tasks/:id                               # 更新任务
DELETE /api/tasks/:id                               # 删除任务
GET    /api/tasks/:id/activity                      # 查询任务操作记录
GET    /api/board                                   # 看板聚合数据
GET    /api/board/stats                             # 看板统计数据
```

### 成员（Member）
```
GET    /api/members
GET    /api/members/:id
POST   /api/members
PATCH  /api/members/:id
DELETE /api/members/:id
```

### 会议（Meeting）
```
GET    /api/meetings
GET    /api/meetings/:id
POST   /api/meetings
PATCH  /api/meetings/:id
DELETE /api/meetings/:id
GET    /api/meetings/:id/participants
PATCH  /api/meetings/:id/participants
```

---

## 常用命令

```bash
npm run dev:api      # 启动后端服务
npm run dev:web      # 启动前端开发服务（含热更新）
npm run build:web    # 打包前端到 apps/web/dist/main.js
npm run check:api    # TypeScript 类型检查
```

---

## 文档索引

| 文档 | 说明 |
|---|---|
| `docs/api/intake-api.md` | 会议解析接口详细说明（含请求/响应示例、引擎降级策略、规则引擎说明） |
| `docs/api/members-meetings-api.md` | 成员与会议接口说明 |
| `docs/api/action-items-fields.md` | ActionItem 字段规范 |
| `docs/api/action-items-schema.md` | ActionItem JSON Schema 定义 |
| `docs/api/tasks-table.sql` | tasks 表 DDL |
| `docs/product/module-3-4-architecture.md` | 任务分发与看板模块架构图 |

---

## 已知限制与规划中功能

| 项目 | 状态 |
|---|---|
| 任务负责人外键关联（`owner_member_id`） | 已实现迁移逻辑，前端仍用 `ownerName` 文本匹配 |
| 任务手动创建表单 | 未实现 |
| 任务搜索与排序 | 未实现 |
| 成员唯一约束（数据库层） | 前端已拦截，后端待补 |
| Worker 异步任务（逾期提醒、周报） | 目录预留，未实现 |
| 自动化测试 | 未补充 |
| 音视频文件导入与转写 | 未实现（当前支持文本文件） |
