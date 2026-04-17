# ActionItems 字段说明

本文档单独说明 `ActionItemsPayload` 和 `ActionItem` 中每个字段的用途、类型、是否必填以及示例值，供模块 2、3、4 联调时统一口径。

结构定义原文见 [docs/api/action-items-schema.md](docs/api/action-items-schema.md)。

## 1. 顶层字段

| 字段名 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `summary` | `string` | 是 | 本次会议或输入文本的摘要，供前端展示和后续记录使用。 | `本次组会主要讨论了对比实验复现和数据增强策略。` |
| `actionItems` | `ActionItem[]` | 是 | AI 提取出的行动项列表，是模块 3 和模块 4 的核心输入。 | `[{...}, {...}]` |

## 2. ActionItem 字段

| 字段名 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- | --- |
| `id` | `string` | 是 | 行动项在 AI 输出中的唯一标识，用于联调、追踪和导入映射。建议由模块 2 生成稳定值。 | `ai_001` |
| `title` | `string` | 是 | 行动项标题，要求简洁明确，适合直接显示在任务卡片上。 | `完成三组对比实验复现` |
| `description` | `string` | 是 | 行动项的完整说明，用于详情页和后续任务描述。 | `基于当前基线模型完成论文中三组对比实验复现，并整理结果。` |
| `ownerName` | `string \| null` | 否 | 负责人姓名。若 AI 无法确定，可为空，由用户在导入确认页手动补充。 | `小王` |
| `dueDate` | `string \| null` | 否 | 截止日期，建议统一使用 `YYYY-MM-DD`。无法识别时可为空。 | `2026-04-24` |
| `priority` | `'low' \| 'medium' \| 'high'` | 是 | 优先级，用于排序、提醒和高亮显示。 | `high` |
| `status` | `'todo' \| 'doing' \| 'done'` | 是 | 初始状态。模块 2 默认建议输出 `todo`。 | `todo` |
| `acceptanceCriteria` | `string \| null` | 否 | 验收标准，描述什么情况下任务算完成。适合在详情页中展示。 | `提交实验结果表，并分析不同设置的性能差异。` |
| `sourceText` | `string` | 是 | 该行动项对应的原始会议语句或纪要原文，支撑溯源能力。 | `小王下周把这三组对比实验跑完，结果整理成表。` |
| `sourceTimestamp` | `string \| null` | 否 | 原文在音频或转写内容中的时间位置，便于后续扩展音频跳转。 | `00:18:32` |
| `confidence` | `number` | 是 | AI 对该行动项提取结果的置信度，取值范围建议为 `0` 到 `1`。 | `0.92` |
| `tags` | `string[]` | 是 | 行动项标签，用于分类、筛选和后续统计。 | `['实验', '复现', 'CVPR']` |

## 3. 字段使用建议

### 3.1 模块 2 必须保证的字段

为了让你负责的模块 3 和模块 4 能稳定运行，模块 2 至少要保证以下字段始终返回：

- `id`
- `title`
- `description`
- `priority`
- `status`
- `sourceText`
- `confidence`
- `tags`

如果缺这些字段，任务导入、看板展示和详情查看都会变得不稳定。

### 3.2 允许人工确认的字段

以下字段如果 AI 不确定，可以先返回 `null`，再由导入确认页补齐：

- `ownerName`
- `dueDate`
- `acceptanceCriteria`
- `sourceTimestamp`

### 3.3 最适合你负责模块使用的字段

你负责的 3-4 模块里，这几个字段最关键：

- `title`：用于任务卡片标题
- `ownerName`：用于任务负责人展示
- `dueDate`：用于到期提示和逾期统计
- `priority`：用于任务高亮和排序
- `status`：用于看板列归属
- `acceptanceCriteria`：用于详情页说明完成标准
- `sourceText`：用于展示任务来源
- `confidence`：用于低置信度提醒

## 4. 推荐值规范

### 优先级 priority

| 值 | 含义 |
| --- | --- |
| `low` | 低优先级，可延后处理 |
| `medium` | 中优先级，正常推进 |
| `high` | 高优先级，需优先关注 |

### 状态 status

| 值 | 含义 |
| --- | --- |
| `todo` | 待开始 |
| `doing` | 进行中 |
| `done` | 已完成 |

### 置信度 confidence

| 区间 | 建议处理方式 |
| --- | --- |
| `0.85 - 1.00` | 基本可信，可直接导入 |
| `0.60 - 0.84` | 建议人工快速确认 |
| `0.00 - 0.59` | 建议重点检查或高亮提醒 |

## 5. 单条行动项示例

```json
{
  "id": "ai_001",
  "title": "完成三组对比实验复现",
  "description": "基于当前基线模型，完成论文中三组对比实验的复现，并整理结果表格。",
  "ownerName": "小王",
  "dueDate": "2026-04-24",
  "priority": "high",
  "status": "todo",
  "acceptanceCriteria": "提交实验结果表，并汇报不同设置下的性能差异。",
  "sourceText": "小王下周把这三组对比实验跑完，结果整理成表。",
  "sourceTimestamp": "00:18:32",
  "confidence": 0.92,
  "tags": ["实验", "复现", "CVPR"]
}
```

## 6. 当前建议

现阶段最重要的是先把字段名和取值范围定死，不要在联调时再出现：

- `ownerName` 和 `assignee` 混用
- `dueDate` 和 `deadline` 混用
- `priority` 既有英文又有中文
- `status` 取值不统一

这些问题不会让系统“写不出来”，但会直接拖慢你们本周联调速度。