import Anthropic from '@anthropic-ai/sdk';

import type {
  ActionItem,
  ActionItemsPayload,
  ImportMeetingIntakeInput,
  MeetingIntake,
  MeetingIntakeParserMode,
  ParseMeetingInput,
  ParseMeetingResponse,
  Task,
} from '../../../../../packages/shared/src';
import { actionItemsPayloadSchema } from '../../../../../packages/shared/src';
import type { DatabaseClient } from '../../db/database-client';
import { NotFoundError } from '../../errors';
import type { TaskService } from '../task/task.service';

type IntakeRow = {
  id: string;
  meeting_id: string | null;
  operator_name: string;
  source_type: 'text' | 'file';
  source_name: string | null;
  source_content: string;
  normalized_content: string;
  parser_mode: MeetingIntakeParserMode;
  parser_engine: string;
  status: 'parsed' | 'failed' | 'imported';
  summary: string | null;
  action_items_json: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  parsed_at: string | null;
  imported_at: string | null;
};

type LlmParsedPayload = {
  payload: ActionItemsPayload;
  engine: string;
};

function createIntakeId(): string {
  return `intake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createActionItemId(index: number): string {
  return `ai_${Date.now()}_${String(index + 1).padStart(3, '0')}`;
}

function mapIntakeRow(row: IntakeRow): MeetingIntake {
  const actionItems = JSON.parse(row.action_items_json) as ActionItem[];

  return {
    id: row.id,
    meetingId: row.meeting_id,
    operatorName: row.operator_name,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceContent: row.source_content,
    normalizedContent: row.normalized_content,
    parserMode: row.parser_mode,
    parserEngine: row.parser_engine,
    status: row.status,
    summary: row.summary,
    actionItems,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    parsedAt: row.parsed_at,
    importedAt: row.imported_at,
  };
}

function normalizeContent(content: string): string {
  return content
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function summarizeContent(content: string): string {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.slice(0, 3).join(' ');
  return joined.slice(0, 160) || '本次会议围绕任务推进、分工与交付节点展开。';
}

function splitCandidates(content: string): string[] {
  return content
    .split(/\n|[。！？；;]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 6);
}

function computePriority(text: string): ActionItem['priority'] {
  if (/(尽快|立即|今天|今晚|明天|周五前|本周内|紧急|优先)/.test(text)) {
    return 'high';
  }

  if (/(下周|本月|同步|整理|补充)/.test(text)) {
    return 'medium';
  }

  return 'low';
}

function deriveTags(text: string): string[] {
  const tagRules: Array<[RegExp, string]> = [
    [/(实验|对比|跑数|复现)/, '实验'],
    [/(模型|训练|推理|调参|算法)/, '模型'],
    [/(数据|标注|清洗|样本)/, '数据'],
    [/(论文|报告|汇报|PPT|文档)/, '文档'],
    [/(代码|接口|前端|后端|联调|修复)/, '开发'],
    [/(评审|答辩|会议|组会)/, '会议'],
  ];

  const tags = tagRules
    .filter(([pattern]) => pattern.test(text))
    .map(([, tag]) => tag);

  return tags.length > 0 ? tags : ['会议行动项'];
}

function cleanTitle(text: string): string {
  return text
    .replace(/^(请|需要|安排|由|让|麻烦)/, '')
    .replace(/[，,].*$/, '')
    .trim()
    .slice(0, 40) || '待确认行动项';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAcceptanceCriteria(text: string): string | null {
  if (/(提交|产出|给出|整理成|同步|汇报|更新)/.test(text)) {
    return `完成后需明确输出结果：${text.slice(0, 80)}`;
  }

  return null;
}

function parseRelativeDueDate(text: string): string | null {
  const now = new Date();
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);

  const plusDays = (days: number): string => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().slice(0, 10);
  };

  const weekdayMap: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    日: 0,
    天: 0,
  };

  if (/(今天|今日)/.test(text)) {
    return plusDays(0);
  }
  if (/(明天|明日)/.test(text)) {
    return plusDays(1);
  }
  if (/(后天)/.test(text)) {
    return plusDays(2);
  }
  if (/(本周内|这周内)/.test(text)) {
    return plusDays(5);
  }
  if (/(下周)/.test(text)) {
    return plusDays(7);
  }
  if (/(本月底)/.test(text)) {
    const result = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return result.toISOString().slice(0, 10);
  }

  const absoluteMatch = text.match(/(20\d{2}-\d{2}-\d{2})/);
  if (absoluteMatch) {
    return absoluteMatch[1];
  }

  const weekMatch = text.match(/(?:本周|这周|下周)周([一二三四五六日天])/);
  if (weekMatch) {
    const target = weekdayMap[weekMatch[1]];
    const current = date.getDay();
    const offsetBase = /下周/.test(text) ? 7 : 0;
    let offset = target - current + offsetBase;

    if (offset < 0 && offsetBase === 0) {
      offset += 7;
    }

    return plusDays(offset);
  }

  return null;
}

async function listKnownMembers(db: DatabaseClient): Promise<string[]> {
  const rows = await db.all<{ name: string }>('SELECT name FROM members ORDER BY created_at DESC');
  return rows.map((row) => row.name);
}

function detectOwner(text: string, members: string[]): string | null {
  const knownMember = members.find((name) => text.includes(name));
  if (knownMember) {
    return knownMember;
  }

  const ownerPrefixes = ['导师', '老师', '大家', '我们', '你们', '本周', '下周', '今天', '明天', '后天'];
  const invalidOwnerKeywords = [
    '对比实验',
    '实验',
    '导入链路',
    '链路',
    '前端',
    '后端',
    '接口',
    '数据',
    '数据集',
    '表格',
    '结果',
    '文档',
    '汇报',
    'PPT',
    '会议',
    '行动项',
    '任务',
    '项目',
  ];
  const invalidOwnerPatterns = [
    /(本周|下周|今天|明天|后天|周一|周二|周三|周四|周五|周六|周日)/,
    /(之前|之后|以内|以内|当天|周前|周后)/,
    /^(尽快|优先|立即)$/,
  ];

  const ownerPatterns = [
    /(?:由|让|安排)?([A-Z][a-z]+|[\u4e00-\u9fa5]{2,4})(?:负责|跟进|完成|推进|整理|提交|输出|补充|实现|修复|复现|跑完)/,
    /([A-Z][a-z]+|[\u4e00-\u9fa5]{2,4})需要/,
    /([A-Z][a-z]+|[\u4e00-\u9fa5]{2,4})先/,
  ];

  for (const pattern of ownerPatterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();

    if (!candidate) {
      continue;
    }

    if (ownerPrefixes.includes(candidate)) {
      continue;
    }

    if (invalidOwnerKeywords.some((keyword) => candidate.includes(keyword))) {
      continue;
    }

    if (invalidOwnerPatterns.some((pattern) => pattern.test(candidate))) {
      continue;
    }

    if (/^[\u4e00-\u9fa5]{2,4}$/.test(candidate) || /^[A-Z][a-z]+$/.test(candidate)) {
      return candidate;
    }
  }

  for (const member of members) {
    const exactPattern = new RegExp(`(^|[^\\u4e00-\\u9fa5A-Za-z])${escapeRegExp(member)}([^\\u4e00-\\u9fa5A-Za-z]|$)`);
    if (exactPattern.test(text)) {
      return member;
    }
  }

  return null;
}

function looksLikeActionItem(text: string): boolean {
  return /(负责|需要|请|安排|跟进|完成|推进|提交|整理|同步|补充|实现|修复|复现|跑完|输出|确认)/.test(text);
}

function heuristicParse(content: string, members: string[]): ActionItemsPayload {
  const summary = summarizeContent(content);
  const candidates = splitCandidates(content).filter(looksLikeActionItem);

  const actionItems = candidates.slice(0, 12).map((candidate, index) => {
    const ownerName = detectOwner(candidate, members);
    const priority = computePriority(candidate);
    const dueDate = parseRelativeDueDate(candidate);

    return {
      id: createActionItemId(index),
      title: cleanTitle(candidate),
      description: candidate,
      ownerName,
      dueDate,
      priority,
      status: 'todo' as const,
      acceptanceCriteria: buildAcceptanceCriteria(candidate),
      sourceText: candidate,
      sourceTimestamp: null,
      confidence: ownerName || dueDate ? 0.82 : 0.68,
      tags: deriveTags(candidate),
    };
  });

  if (actionItems.length > 0) {
    return { summary, actionItems };
  }

  return {
    summary,
    actionItems: [
      {
        id: createActionItemId(0),
        title: '人工确认会议行动项',
        description: '当前文本未识别出明确行动项，请人工确认会议纪要中的责任人、截止时间和交付物。',
        ownerName: null,
        dueDate: null,
        priority: 'medium',
        status: 'todo',
        acceptanceCriteria: '补充至少 1 条明确的行动项描述。',
        sourceText: content.slice(0, 200),
        sourceTimestamp: null,
        confidence: 0.35,
        tags: ['人工确认'],
      },
    ],
  };
}

const CLAUDE_SYSTEM_PROMPT = `你是一个专业的科研团队会议行动项提取助手。

从会议纪要中识别每一条行动项，提取以下字段：
- title: 简短任务标题（不超过40字），去掉"请"/"需要"等前缀
- description: 完整描述，保留上下文
- ownerName: 负责人姓名（中文姓名2-4字或英文名），无法识别则为 null
- dueDate: 截止日期（ISO 8601格式 YYYY-MM-DD），无法识别则为 null（今天/明天/下周等相对日期请换算为绝对日期）
- priority: "high"（紧急/今天/明天）| "medium"（下周/本月）| "low"（未指明）
- status: 始终为 "todo"
- acceptanceCriteria: 验收标准，如有产出物则填写，否则为 null
- sourceText: 原文片段（最多200字）
- sourceTimestamp: 时间戳，会议纪要无时间戳时为 null
- confidence: 0-1置信度（能识别owner+dueDate为0.85，仅有其一为0.75，两者都没有为0.60）
- tags: 相关标签数组，从["实验","模型","数据","文档","开发","会议"]中选，无则为["会议行动项"]
- id: 唯一字符串，格式为 "ai_<timestamp>_<三位序号>"

同时生成 summary：会议核心内容摘要（50-150字）。

严格按照工具参数 JSON schema 输出，不输出额外文字。`;

async function tryParseWithClaude(content: string): Promise<LlmParsedPayload | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_AUTH_TOKEN;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().slice(0, 10);

  const toolInputSchema = {
    type: 'object' as const,
    required: ['summary', 'actionItems'],
    properties: {
      summary: { type: 'string', minLength: 1 },
      actionItems: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'title', 'description', 'priority', 'status', 'sourceText', 'confidence', 'tags'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string', maxLength: 120 },
            description: { type: 'string', maxLength: 1000 },
            ownerName: { type: ['string', 'null'] },
            dueDate: { type: ['string', 'null'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            status: { type: 'string', enum: ['todo', 'in_progress', 'done', 'blocked'] },
            acceptanceCriteria: { type: ['string', 'null'] },
            sourceText: { type: 'string', maxLength: 1000 },
            sourceTimestamp: { type: ['string', 'null'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            tags: { type: 'array', items: { type: 'string' } },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  };

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: CLAUDE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'extract_action_items',
        description: '将会议纪要解析为结构化行动项列表',
        input_schema: toolInputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: 'extract_action_items' },
    messages: [
      {
        role: 'user',
        content: `今天是 ${today}。\n\n会议纪要：\n${content}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
  );

  if (!toolUse) {
    throw new Error('Claude returned no tool use block.');
  }

  return {
    payload: toolUse.input as ActionItemsPayload,
    engine: `claude:${model}`,
  };
}

async function tryParseWithOpenAI(content: string): Promise<LlmParsedPayload | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey || !model) {
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions:
        '你是一个科研团队会议行动项提取助手。请把会议纪要转换为结构化 ActionItemsPayload，严格输出 JSON，不要输出额外解释。',
      input: content,
      text: {
        format: {
          type: 'json_schema',
          name: 'action_items_payload',
          schema: actionItemsPayloadSchema,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI parse failed with status ${response.status}.`);
  }

  const data = await response.json() as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  const outputText =
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim();

  if (!outputText) {
    throw new Error('OpenAI parse returned empty output.');
  }

  return {
    payload: JSON.parse(outputText) as ActionItemsPayload,
    engine: `openai:${model}`,
  };
}

function sanitizePayload(payload: ActionItemsPayload): ActionItemsPayload {
  return {
    summary: payload.summary?.trim() || '本次会议围绕研发任务推进展开。',
    actionItems: (payload.actionItems ?? []).map((item, index) => ({
      id: item.id?.trim() || createActionItemId(index),
      title: item.title?.trim() || `行动项 ${index + 1}`,
      description: item.description?.trim() || item.sourceText?.trim() || '待补充描述',
      ownerName: item.ownerName?.trim() || null,
      dueDate: item.dueDate?.trim() || null,
      priority: item.priority ?? 'medium',
      status: item.status ?? 'todo',
      acceptanceCriteria: item.acceptanceCriteria?.trim() || null,
      sourceText: item.sourceText?.trim() || item.description?.trim() || '待补充来源语句',
      sourceTimestamp: item.sourceTimestamp?.trim() || null,
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.7,
      tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
    })),
  };
}

export class IntakeService {
  constructor(
    private readonly db: DatabaseClient,
    private readonly taskService: TaskService,
  ) {}

  async listIntakes(): Promise<MeetingIntake[]> {
    const rows = await this.db.all<IntakeRow>(
      `
        SELECT
          id,
          meeting_id,
          operator_name,
          source_type,
          source_name,
          source_content,
          normalized_content,
          parser_mode,
          parser_engine,
          status,
          summary,
          action_items_json,
          error_message,
          created_at,
          updated_at,
          parsed_at,
          imported_at
        FROM meeting_intakes
        ORDER BY created_at DESC
      `,
    );

    return rows.map(mapIntakeRow);
  }

  async getIntakeById(id: string): Promise<MeetingIntake> {
    const row = await this.db.get<IntakeRow>(
      `
        SELECT
          id,
          meeting_id,
          operator_name,
          source_type,
          source_name,
          source_content,
          normalized_content,
          parser_mode,
          parser_engine,
          status,
          summary,
          action_items_json,
          error_message,
          created_at,
          updated_at,
          parsed_at,
          imported_at
        FROM meeting_intakes
        WHERE id = ?
      `,
      [id],
    );

    if (!row) {
      throw new NotFoundError(`Meeting intake ${id} not found.`);
    }

    return mapIntakeRow(row);
  }

  async parseMeetingContent(input: ParseMeetingInput): Promise<ParseMeetingResponse> {
    const intakeId = createIntakeId();
    const createdAt = new Date().toISOString();
    const normalizedContent = normalizeContent(input.content);
    const members = await listKnownMembers(this.db);
    const parserMode = input.parserMode ?? 'auto';
    let parserEngine = 'heuristic:v1';
    let status: MeetingIntake['status'] = 'parsed';
    let errorMessage: string | null = null;
    let payload: ActionItemsPayload;

    try {
      if (parserMode !== 'heuristic') {
        const claudePayload = await tryParseWithClaude(normalizedContent);
        if (claudePayload) {
          payload = sanitizePayload(claudePayload.payload);
          parserEngine = claudePayload.engine;
        } else {
          const openAiPayload = await tryParseWithOpenAI(normalizedContent);
          if (openAiPayload) {
            payload = sanitizePayload(openAiPayload.payload);
            parserEngine = openAiPayload.engine;
          } else {
            payload = heuristicParse(normalizedContent, members);
          }
        }
      } else {
        payload = heuristicParse(normalizedContent, members);
      }
    } catch (error) {
      payload = heuristicParse(normalizedContent, members);
      parserEngine = 'heuristic:fallback';
      errorMessage = error instanceof Error ? error.message : 'Unknown parse error.';
    }

    const parsedAt = new Date().toISOString();

    await this.db.run(
      `
        INSERT INTO meeting_intakes (
          id,
          meeting_id,
          operator_name,
          source_type,
          source_name,
          source_content,
          normalized_content,
          parser_mode,
          parser_engine,
          status,
          summary,
          action_items_json,
          error_message,
          parsed_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        intakeId,
        input.meetingId ?? null,
        input.operatorName?.trim() || 'system',
        input.sourceType ?? 'text',
        input.sourceName ?? null,
        input.content,
        normalizedContent,
        parserMode,
        parserEngine,
        status,
        payload.summary,
        JSON.stringify(payload.actionItems),
        errorMessage,
        parsedAt,
        createdAt,
        createdAt,
      ],
    );

    const intake = await this.getIntakeById(intakeId);
    return { intake, payload };
  }

  async importToBoard(id: string, input: ImportMeetingIntakeInput = {}): Promise<{ intake: MeetingIntake; items: Task[]; count: number }> {
    const intake = await this.getIntakeById(id);

    if (intake.actionItems.length === 0) {
      throw new Error('No action items available to import.');
    }

    const tasks = await this.taskService.importFromActionItems({
      meetingId: intake.meetingId,
      intakeId: intake.id,
      operatorName: input.operatorName ?? intake.operatorName,
      actionItems: intake.actionItems,
    });

    await this.db.run(
      `
        UPDATE meeting_intakes
        SET status = ?, imported_at = ?
        WHERE id = ?
      `,
      ['imported', new Date().toISOString(), id],
    );

    return {
      intake: await this.getIntakeById(id),
      items: tasks,
      count: tasks.length,
    };
  }

  async deleteIntake(id: string): Promise<{ deleted: true; id: string }> {
    const intake = await this.getIntakeById(id);

    await this.db.run('DELETE FROM meeting_intakes WHERE id = ?', [intake.id]);

    return {
      deleted: true,
      id: intake.id,
    };
  }
}
