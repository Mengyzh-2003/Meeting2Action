export const ACTION_ITEM_PRIORITIES = ['low', 'medium', 'high'] as const;

export const ACTION_ITEM_STATUSES = ['todo', 'doing', 'done'] as const;

export type ActionItemPriority = (typeof ACTION_ITEM_PRIORITIES)[number];

export type ActionItemStatus = (typeof ACTION_ITEM_STATUSES)[number];

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

export function isActionItemPriority(value: unknown): value is ActionItemPriority {
  return typeof value === 'string' && ACTION_ITEM_PRIORITIES.includes(value as ActionItemPriority);
}

export function isActionItemStatus(value: unknown): value is ActionItemStatus {
  return typeof value === 'string' && ACTION_ITEM_STATUSES.includes(value as ActionItemStatus);
}