# ActionItems 结构定义

本文档定义模块 2 输出给模块 3-4 的标准行动项结构，用于前后端联调、接口设计和后续 Schema 校验。

## 1. 设计目标

这份结构定义遵循三个原则：

1. 可被 AI 稳定输出。
2. 可被模块 3 直接转换为任务。
3. 可被模块 4 直接展示在看板和详情页中。

因此，这里不追求字段过多，而是优先保证字段稳定、语义清晰、便于落库。

## 2. 顶层结构

模块 2 返回结果建议统一为一个对象，而不是单独返回数组。

```json
{
  "summary": "本次组会主要讨论了基线模型复现、数据增强策略和下周实验分工。",
  "actionItems": [
    {
      "id": "ai_001",
      "title": "完成三组对比实验复现",
      "description": "基于当前基线模型，完成论文中三组对比实验的复现，并整理结果表格。",
      "ownerName": "小王",
      "dueDate": "2026-04-24",
      "priority": "high",
      "status": "todo",
      "acceptanceCriteria": "提交实验结果表，汇报不同设置下的性能差异。",
      "sourceText": "小王下周把这三组对比实验跑完，结果整理成表。",
      "sourceTimestamp": "00:18:32",
      "confidence": 0.92,
      "tags": ["实验", "复现", "CVPR"]
    }
  ]
}
```

## 3. TypeScript 接口定义

```ts
export type ActionItemPriority = 'low' | 'medium' | 'high';

export type ActionItemStatus = 'todo' | 'doing' | 'done';

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  ownerName: string | null;
  dueDate: string | null;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  acceptanceCriteria: string | null;
  sourceText: string;
  sourceTimestamp: string | null;
  confidence: number;
  tags: string[];
}

export interface ActionItemsPayload {
  summary: string;
  actionItems: ActionItem[];
}
```

## 4. JSON Schema 风格定义

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ActionItemsPayload",
  "type": "object",
  "required": ["summary", "actionItems"],
  "properties": {
    "summary": {
      "type": "string",
      "minLength": 1
    },
    "actionItems": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "title",
          "description",
          "priority",
          "status",
          "sourceText",
          "confidence",
          "tags"
        ],
        "properties": {
          "id": {
            "type": "string",
            "minLength": 1
          },
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "description": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1000
          },
          "ownerName": {
            "type": ["string", "null"],
            "maxLength": 50
          },
          "dueDate": {
            "type": ["string", "null"],
            "format": "date"
          },
          "priority": {
            "type": "string",
            "enum": ["low", "medium", "high"]
          },
          "status": {
            "type": "string",
            "enum": ["todo", "doing", "done"]
          },
          "acceptanceCriteria": {
            "type": ["string", "null"],
            "maxLength": 500
          },
          "sourceText": {
            "type": "string",
            "minLength": 1,
            "maxLength": 1000
          },
          "sourceTimestamp": {
            "type": ["string", "null"]
          },
          "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 1
          },
          "tags": {
            "type": "array",
            "items": {
              "type": "string",
              "maxLength": 30
            }
          }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

## 5. 字段设计约束

### 5.1 必填字段

这些字段建议作为联调时的必填项：

- `id`
- `title`
- `description`
- `priority`
- `status`
- `sourceText`
- `confidence`
- `tags`

原因是模块 3 和模块 4 至少需要这些信息来完成任务生成、展示和溯源。

### 5.2 可空字段

这些字段允许 AI 暂时识别不出来：

- `ownerName`
- `dueDate`
- `acceptanceCriteria`
- `sourceTimestamp`

这样可以避免因为个别字段识别失败导致整条行动项被丢弃。

### 5.3 状态默认值

模块 2 如果没有特别逻辑，建议统一输出：

```json
{
  "status": "todo"
}
```

因为任务在导入系统前，本质上都还没有真正开始执行。

### 5.4 置信度建议

`confidence` 建议保留为 0 到 1 之间的小数。例如：

- `0.95` 表示高置信度
- `0.60` 表示中等置信度
- `0.35` 表示需要人工重点确认

模块 3 可以利用这个字段决定是否高亮提示，模块 4 可以在详情页展示给用户。

## 6. 模块 3 的映射建议

从 `ActionItem` 映射到内部 `Task` 时，建议遵循如下规则：

- `title -> task.title`
- `description -> task.description`
- `ownerName -> task.ownerName`
- `dueDate -> task.dueDate`
- `priority -> task.priority`
- `status -> task.status`
- `acceptanceCriteria -> task.acceptanceCriteria`
- `sourceText -> task.sourceText`
- `confidence -> task.confidence`
- `tags -> task.tags`

其中 `id` 不建议直接作为数据库主键，但可以作为导入来源标识保存在 `sourceActionItemId` 字段中。

## 7. 当前版本结论

这份结构定义的核心目的，是让模块 2、3、4 在联调时有一份明确稳定的数据契约。你们后续即使要加复杂字段，也建议在这个版本稳定跑通后再扩展。

字段逐项解释见 [docs/api/action-items-fields.md](docs/api/action-items-fields.md)。