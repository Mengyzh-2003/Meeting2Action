export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  sourceActionItemId: string;
  meetingId: string | null;
  title: string;
  description: string;
  ownerName: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  acceptanceCriteria: string | null;
  sourceText: string;
  sourceTimestamp: string | null;
  confidence: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivityLog {
  id: string;
  taskId: string;
  actionType: 'created' | 'updated' | 'status_changed' | 'owner_changed' | 'due_date_changed';
  actionDetail: string;
  operatorName: string;
  createdAt: string;
}

export interface ImportActionItemsInput {
  meetingId?: string | null;
  operatorName?: string;
  actionItems: Array<{
    id: string;
    title: string;
    description: string;
    ownerName: string | null;
    dueDate: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    acceptanceCriteria: string | null;
    sourceText: string;
    sourceTimestamp: string | null;
    confidence: number;
    tags: string[];
  }>;
}

export interface ListTasksQuery {
  status?: TaskStatus;
  ownerName?: string;
  meetingId?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  ownerName?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  acceptanceCriteria?: string | null;
  operatorName?: string;
}

export interface BoardColumn {
  status: TaskStatus;
  title: 'To Do' | 'Doing' | 'Done';
  items: Task[];
}

export interface BoardStats {
  total: number;
  todo: number;
  doing: number;
  done: number;
  overdue: number;
  dueSoon: number;
}

export interface BoardResponse {
  columns: BoardColumn[];
  stats: BoardStats;
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && TASK_PRIORITIES.includes(value as TaskPriority);
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus);
}