# Meeting2Action（会易达）

Meeting2Action 是一个面向科研/研发团队的会议任务管理 Web 应用。
它把会议纪要中的 action items 导入为结构化任务，并提供看板、统计、成员管理、会议管理等能力，支持本地快速演示与联调。

## 当前版本状态

- 可运行：前后端本地联调已打通。
- 前端：已实现三视图页面（解析舱、研发工作台、团队与会议中心），采用统一 Apple 风格 UI。
- 后端：已实现 Task / Board / Member / Meeting 的核心 REST 接口。
- 数据库：SQLite 本地文件持久化（默认 `data/meeting2action.db`）。
- Worker：目录已预留，当前未实现业务逻辑。
- Tests：目录已预留，当前未补充自动化测试。

## 技术栈

- 前端：TypeScript + esbuild + 原生 HTML/CSS
- 后端：Node.js 原生 HTTP（无框架）+ TypeScript
- 数据库：SQLite（`node:sqlite`）
- 运行方式：Monorepo 目录组织，npm scripts 启动

## 目录结构（实际）

```text
Meeting2Action/
├─ apps/
│  ├─ api/               # 后端服务（127.0.0.1:3001）
│  ├─ web/               # 前端页面（127.0.0.1:3000）
│  └─ worker/            # 预留
├─ packages/
│  └─ shared/            # 共享类型与 schema
├─ data/
│  └─ meeting2action.db  # SQLite 数据库文件
├─ docs/
│  ├─ api/
│  └─ product/
├─ scripts/
│  └─ start-dev.cmd      # Windows 一键启动脚本
├─ tests/                # 预留
├─ package.json
└─ tsconfig.json
```

## 快速开始

### 环境要求

- Node.js 22+
- npm 10+
- Windows（若使用 `scripts/start-dev.cmd`）

### 方式 A：一键启动（推荐，Windows）

在仓库根目录执行：

```bat
scripts\start-dev.cmd
```

脚本行为：

1. 若不存在 `node_modules` 则自动执行 `npm install`
2. 新开终端启动 API：`npm run dev:api`
3. 新开终端启动 Web：`npm run dev:web`
4. 自动打开浏览器到 `http://127.0.0.1:3000`

### 方式 B：手动启动

```bash
npm install
npm run dev:api
npm run dev:web
```

访问地址：

- Web：`http://127.0.0.1:3000`
- API：`http://127.0.0.1:3001`
- Health：`GET http://127.0.0.1:3001/health`

## 前端功能（当前实现）

### 1) 智能解析舱（Inbox）

- 粘贴/载入 ActionItems JSON
- 解析预览待导入任务
- 确认导入任务到数据库
- 导入反馈信息展示

### 2) 研发工作台（Workspace）

- Kanban 三列：todo / doing / done
- 统计卡片：总数、进行中、风险相关指标
- 任务筛选：状态、负责人、风险（统一为自定义下拉 UI）
- 任务详情右侧抽屉查看
- 任务详情支持负责人切换与截止时间滚轮调整（自动保存）

### 3) 团队与会议中心（Hub）

- 成员管理：新增、查询、编辑、删除
- 成员表格视图：吸顶表头、超 7 行滚动、成员搜索
- 会议管理：新增、查询、编辑、删除
- 会议参会人选择与更新

## 后端 API（当前实现）

### 健康检查

- `GET /health`

### Task / Board

- `POST /api/tasks/import-from-action-items`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `GET /api/tasks/:id/activity`
- `GET /api/board`
- `GET /api/board/stats`

### Member

- `GET /api/members`
- `GET /api/members/:id`
- `POST /api/members`
- `PATCH /api/members/:id`
- `DELETE /api/members/:id`

### Meeting

- `GET /api/meetings`
- `GET /api/meetings/:id`
- `POST /api/meetings`
- `PATCH /api/meetings/:id`
- `DELETE /api/meetings/:id`
- `GET /api/meetings/:id/participants`
- `PATCH /api/meetings/:id/participants`

## 数据与约束说明

- 默认数据库路径：`data/meeting2action.db`
- 可通过环境变量覆盖：`MEETING2ACTION_DB_PATH`
- 会议删除时会：
  - 删除 `meeting_participants` 关联
  - 将 `tasks.meeting_id` 置为 `NULL`
- 成员删除时会：
  - 删除 `meeting_participants` 关联

## 常用命令

```bash
npm run dev:api     # 启动 API
npm run dev:web     # 启动前端开发服务
npm run build:web   # 打包前端到 apps/web/dist/main.js
npm run check:api   # TypeScript 类型检查
```

## 文档索引

- `docs/api/action-items-schema.md`
- `docs/api/action-items-fields.md`
- `docs/api/tasks-table.sql`
- `docs/api/members-meetings-api.md`
- `docs/api/seed-sample-data.sql`
- `docs/product/module-3-4-architecture.md`

## 已知限制与下一步

- 当前任务负责人仍是 `ownerName` 文本字段，尚未升级为 `memberId` 外键。
- 前端仍缺少任务搜索、排序、手动创建任务表单。
- 成员重名当前做了前端拦截，后端和数据库唯一约束仍需补齐。
- 自动化测试（单测/E2E）尚未补齐。
- Worker 异步流程（提醒、定时统计、通知）尚未实现。

---

如果用于课程答辩，建议优先展示以下路径：

1. 解析舱导入一批 action items
2. 研发工作台看板流转与风险筛选
3. 团队与会议中心演示成员/会议 CRUD
