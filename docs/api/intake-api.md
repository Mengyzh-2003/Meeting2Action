# Meeting Intake API 说明

更新时间：2026-06-03

本文档描述当前「智能信息捕获与解析」模块的后端接口。该模块负责接收会议文本、调用 AI 或规则引擎抽取结构化行动项，并支持将确认后的结果导入任务看板。

---

## 1. 鉴权说明

当前接口权限如下：

| 接口 | 是否需要登录 |
|---|---|
| `GET /api/meeting-intakes` | 否 |
| `GET /api/meeting-intakes/:id` | 否 |
| `POST /api/meeting-intakes/parse` | 是 |
| `POST /api/meeting-intakes/:id/import-to-board` | 是 |
| `DELETE /api/meeting-intakes/:id` | 是 |

支持两种会话头：

- `Authorization: Bearer <token>`
- `X-Session-Token: <token>`

说明：

- 当接口要求登录时，如果请求体里传了 `operatorName`，后端仍会优先使用当前登录成员姓名作为操作人。

---

## 2. 数据结构

### MeetingIntake

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 唯一标识 |
| `meetingId` | `string \| null` | 关联会议 ID |
| `operatorName` | `string` | 操作人姓名 |
| `sourceType` | `'text' \| 'file'` | 输入来源 |
| `sourceName` | `string \| null` | 文件名 |
| `sourceContent` | `string` | 原始文本 |
| `normalizedContent` | `string` | 标准化文本 |
| `parserMode` | `'auto' \| 'heuristic' \| 'llm'` | 解析模式 |
| `parserEngine` | `string` | 实际使用的引擎 |
| `status` | `'parsed' \| 'failed' \| 'imported'` | 当前状态 |
| `summary` | `string \| null` | 会议摘要 |
| `actionItems` | `ActionItem[]` | 解析出的行动项 |
| `errorMessage` | `string \| null` | 失败错误信息 |
| `parsedAt` | `string \| null` | 解析完成时间 |
| `importedAt` | `string \| null` | 导入完成时间 |
| `createdAt` | `string` | 创建时间 |
| `updatedAt` | `string` | 更新时间 |

---

## 3. 接口列表

### 3.1 解析会议纪要

```http
POST /api/meeting-intakes/parse
```

请求体示例：

```json
{
  "meetingId": "meeting_001",
  "operatorName": "蒙亚舟",
  "parserMode": "auto",
  "sourceType": "text",
  "sourceName": null,
  "content": "今天组会：小王下周五前完成对比实验，王芳负责整理数据，张伟今天修复前端 bug。"
}
```

字段说明：

| 字段 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `content` | 是 | — | 原始会议文本 |
| `operatorName` | 否 | `'system'` | 操作人姓名，登录态下会被当前成员名覆盖 |
| `meetingId` | 否 | `null` | 关联会议 ID |
| `parserMode` | 否 | `'auto'` | `auto` / `heuristic` / `llm` |
| `sourceType` | 否 | `'text'` | `text` / `file` |
| `sourceName` | 否 | `null` | 文件名 |

响应示例：

```json
{
  "intake": {
    "id": "intake_001",
    "parserEngine": "heuristic:v1",
    "status": "parsed"
  },
  "payload": {
    "summary": "本次组会明确了三条任务分工。",
    "actionItems": [
      {
        "id": "ai_001",
        "title": "完成对比实验",
        "description": "小王需在本周五前完成对比实验并整理结果。",
        "ownerName": "小王",
        "dueDate": "2026-06-05",
        "priority": "high",
        "status": "todo",
        "acceptanceCriteria": "实验结果整理完毕并提交。",
        "sourceText": "小王下周五前完成对比实验",
        "sourceTimestamp": null,
        "confidence": 0.95,
        "tags": ["实验"]
      }
    ]
  }
}
```

### 3.2 将解析记录导入看板

```http
POST /api/meeting-intakes/:id/import-to-board
```

请求体可选：

```json
{
  "operatorName": "蒙亚舟"
}
```

说明：

- 导入时会把 `actionItems` 转换成任务写入 `tasks`
- 同时会更新该 intake 的 `status = imported`
- 登录态下 `operatorName` 优先取当前成员名

响应示例：

```json
{
  "intake": {
    "id": "intake_001",
    "status": "imported",
    "importedAt": "2026-06-03T07:30:00.000Z"
  },
  "items": [
    {
      "id": "task_001",
      "title": "完成对比实验"
    }
  ],
  "count": 1
}
```

### 3.3 查询解析记录列表

```http
GET /api/meeting-intakes
```

响应：

```json
{
  "items": [],
  "count": 0
}
```

### 3.4 查询单条解析记录

```http
GET /api/meeting-intakes/:id
```

成功时返回完整 `MeetingIntake` 对象。

### 3.5 删除解析记录

```http
DELETE /api/meeting-intakes/:id
```

响应：

```json
{
  "deleted": true,
  "id": "intake_001"
}
```

说明：

- 删除 intake 不会删除已经导入的任务

---

## 4. 解析引擎优先级

当前解析引擎优先级：

1. Claude LLM（存在 `ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`）
2. OpenAI LLM（存在 `OPENAI_API_KEY`）
3. Heuristic 规则引擎（兜底）

当 `parserMode = heuristic` 时，直接走规则解析，不调用大模型。

---

## 5. Heuristic 规则引擎说明

| 能力 | 当前实现 |
|---|---|
| 行动项识别 | 通过“负责 / 完成 / 提交 / 需要”等关键词触发 |
| 责任人识别 | 优先匹配成员库姓名，其次匹配常见句式 |
| 截止时间识别 | 支持“今天 / 明天 / 本周五 / 下周一”等中文表达 |
| 优先级推断 | 紧急类词汇映射为 high，延后类词汇多映射为 medium |
| 标签生成 | 基于实验、模型、数据、文档、开发、会议等场景词 |
| 置信度评分 | 根据是否识别到 owner / dueDate 等字段给出估计值 |

---

## 6. 环境变量

| 变量名 | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic 官方 API key |
| `ANTHROPIC_AUTH_TOKEN` | 代理服务 token |
| `ANTHROPIC_BASE_URL` | 自定义 Anthropic API 地址 |
| `ANTHROPIC_MODEL` | 指定 Claude 模型 |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | 指定 OpenAI 模型 |
