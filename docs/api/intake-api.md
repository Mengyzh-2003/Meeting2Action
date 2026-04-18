# Meeting Intake API 说明

更新时间：2026-04-18

本文档描述「智能信息捕获与解析」模块的后端接口。该模块负责接收原始会议文本、调用 AI 或规则引擎提取结构化行动项，并将确认结果一键导入任务看板。

---

## 数据结构

### MeetingIntake（解析记录）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 唯一标识，格式 `intake_{timestamp}_{随机}` |
| `meetingId` | `string \| null` | 关联会议 ID（可选） |
| `operatorName` | `string` | 操作人姓名 |
| `sourceType` | `'text' \| 'file'` | 输入来源类型 |
| `sourceName` | `string \| null` | 文件名（文件导入时） |
| `sourceContent` | `string` | 原始输入文本 |
| `normalizedContent` | `string` | 标准化后的文本（清理空白、全角字符等） |
| `parserMode` | `'auto' \| 'heuristic' \| 'llm'` | 解析模式 |
| `parserEngine` | `string` | 实际使用的引擎，如 `claude:claude-sonnet-4-6`、`heuristic:v1` |
| `status` | `'parsed' \| 'failed' \| 'imported'` | 解析状态 |
| `summary` | `string \| null` | AI 生成的会议摘要 |
| `actionItems` | `ActionItem[]` | 提取出的行动项列表 |
| `errorMessage` | `string \| null` | 失败时的错误信息 |
| `parsedAt` | `string \| null` | 解析完成时间（ISO 8601） |
| `importedAt` | `string \| null` | 导入看板时间（ISO 8601） |
| `createdAt` | `string` | 记录创建时间 |
| `updatedAt` | `string` | 最后更新时间 |

---

## 接口列表

### 1. 解析会议纪要

```http
POST /api/meeting-intakes/parse
```

将原始会议文本提交给解析引擎，返回结构化行动项预览，同时持久化解析记录。

**解析引擎优先级：**

1. **Claude LLM**（`ANTHROPIC_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN` 有效时）
2. **OpenAI LLM**（`OPENAI_API_KEY` 有效时）
3. **Heuristic 规则引擎**（兜底，无需 API key）

`parserMode` 为 `heuristic` 时直接走规则引擎，不调用 LLM。

**请求体：**

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

| 字段 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `content` | 是 | — | 原始会议文本 |
| `operatorName` | 否 | `'system'` | 操作人姓名 |
| `meetingId` | 否 | `null` | 关联的会议 ID |
| `parserMode` | 否 | `'auto'` | `auto` / `heuristic` / `llm` |
| `sourceType` | 否 | `'text'` | `text` / `file` |
| `sourceName` | 否 | `null` | 文件名（文件导入时填写） |

**响应（201）：**

```json
{
  "intake": { "id": "intake_...", "parserEngine": "claude:claude-sonnet-4-6", "status": "parsed", ... },
  "payload": {
    "summary": "本次组会明确了三条任务分工。",
    "actionItems": [
      {
        "id": "ai_..._001",
        "title": "完成对比实验",
        "description": "小王需在本周五前完成对比实验并整理结果。",
        "ownerName": "小王",
        "dueDate": "2026-04-24",
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

---

### 2. 将解析记录导入看板

```http
POST /api/meeting-intakes/:id/import-to-board
```

将指定解析记录中的行动项批量转换为任务，写入看板。同时将该记录状态更新为 `imported`。

**请求体（可选）：**

```json
{
  "operatorName": "蒙亚舟"
}
```

**响应（201）：**

```json
{
  "intake": { "id": "intake_...", "status": "imported", "importedAt": "2026-04-18T..." },
  "items": [ { "id": "task_...", "title": "完成对比实验", ... } ],
  "count": 3
}
```

---

### 3. 查询解析记录列表

```http
GET /api/meeting-intakes
```

返回所有解析记录，按创建时间倒序排列。

**响应（200）：**

```json
{
  "items": [ { "id": "intake_...", "summary": "...", "parserEngine": "claude:claude-sonnet-4-6", "status": "parsed", ... } ],
  "count": 5
}
```

---

### 4. 查询单条解析记录

```http
GET /api/meeting-intakes/:id
```

**响应（200）：** 返回完整 `MeetingIntake` 对象（含 `actionItems` 数组）。

**错误（404）：**

```json
{ "message": "Meeting intake {id} not found." }
```

---

### 5. 删除解析记录

```http
DELETE /api/meeting-intakes/:id
```

删除指定解析记录（不影响已导入的任务）。

**响应（200）：**

```json
{ "deleted": true, "id": "intake_..." }
```

---

## 规则引擎说明（Heuristic）

当无 LLM API key 可用，或 `parserMode = heuristic` 时，使用内置规则引擎：

| 能力 | 实现方式 |
|---|---|
| 行动项识别 | 关键词触发：「负责」「需要」「请」「完成」「提交」等 |
| 责任人识别 | 优先匹配成员库姓名；其次匹配「由 X 负责/完成」等句式 |
| 截止时间识别 | 「今天」「明天」「本周五」「下周一」→ 换算为绝对日期 |
| 优先级推断 | 「尽快」「今天」「紧急」→ high；「下周」「本月」→ medium；其余 → low |
| 标签生成 | 正则匹配「实验」「模型」「数据」「文档」「开发」「会议」等场景词 |
| 置信度评分 | 识别到 owner + dueDate → 0.82；仅有其一 → 0.68 |

---

## 环境变量

| 变量名 | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic 官方 API key |
| `ANTHROPIC_AUTH_TOKEN` | 代理服务 token（优先级低于 `ANTHROPIC_API_KEY`） |
| `ANTHROPIC_BASE_URL` | 自定义 API 地址（SDK 自动读取） |
| `ANTHROPIC_MODEL` | 指定 Claude 模型，默认 `claude-sonnet-4-6` |
| `OPENAI_API_KEY` | OpenAI API key（Claude 不可用时降级使用） |
| `OPENAI_MODEL` | 指定 OpenAI 模型 |
