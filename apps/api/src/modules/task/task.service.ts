import type {
  BoardStats,
  BoardResponse,
  CreateTaskInput,
  ImportActionItemsInput,
  ListTasksQuery,
  ListTasksResult,
  Task,
  TaskActivityLog,
  UpdateTaskInput,
} from '../../../../../packages/shared/src';
import {
  isSortOrder,
  isTaskPriority,
  isTaskSortField,
  isTaskStatus,
} from '../../../../../packages/shared/src';
import type { DatabaseClient, DatabaseParameter } from '../../db/database-client';
import { NotFoundError, ValidationError } from '../../errors';

function createTaskId(sourceActionItemId: string): string {
  return `task_${sourceActionItemId}`;
}

function createLogId(taskId: string, index: number): string {
  return `log_${taskId}_${index}`;
}

function createRuntimeLogId(taskId: string): string {
  return `log_${taskId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createManualTaskSourceActionItemId(): string {
  return `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type TaskRow = {
  id: string;
  source_action_item_id: string;
  meeting_id: string | null;
  owner_member_id: string | null;
  title: string;
  description: string;
  owner_name: string | null;
  due_date: string | null;
  priority: Task['priority'];
  status: Task['status'];
  acceptance_criteria: string | null;
  source_text: string;
  source_timestamp: string | null;
  confidence: number;
  tags: string;
  created_at: string;
  updated_at: string;
};

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    sourceActionItemId: row.source_action_item_id,
    meetingId: row.meeting_id,
    ownerMemberId: row.owner_member_id,
    title: row.title,
    description: row.description,
    ownerName: row.owner_name,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status,
    acceptanceCriteria: row.acceptance_criteria,
    sourceText: row.source_text,
    sourceTimestamp: row.source_timestamp,
    confidence: row.confidence,
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
  );
}

function buildOrderClause(sortBy: ListTasksQuery['sortBy'], sortOrder: ListTasksQuery['sortOrder']): string {
  const safeSortBy = sortBy ?? 'createdAt';
  const safeSortOrder = sortOrder ?? 'desc';

  if (!isTaskSortField(safeSortBy)) {
    throw new ValidationError('Task sortBy is invalid.');
  }

  if (!isSortOrder(safeSortOrder)) {
    throw new ValidationError('Task sortOrder must be asc or desc.');
  }

  const direction = safeSortOrder.toUpperCase();

  switch (safeSortBy) {
    case 'updatedAt':
      return `updated_at ${direction}, created_at DESC`;
    case 'dueDate':
      return `CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC, due_date ${direction}, created_at DESC`;
    case 'title':
      return `title COLLATE NOCASE ${direction}, created_at DESC`;
    case 'priority':
      return `CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ${direction}, created_at DESC`;
    case 'status':
      return `CASE status WHEN 'todo' THEN 1 WHEN 'doing' THEN 2 ELSE 3 END ${direction}, created_at DESC`;
    default:
      return `created_at ${direction}`;
  }
}

function isDueSoon(dueDate: string | null): boolean {
  if (!dueDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffInDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffInDays >= 0 && diffInDays <= 3;
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

function buildBoardStats(tasks: Task[]): BoardStats {
  return {
    total: tasks.length,
    todo: tasks.filter((task) => task.status === 'todo').length,
    doing: tasks.filter((task) => task.status === 'doing').length,
    done: tasks.filter((task) => task.status === 'done').length,
    overdue: tasks.filter(isOverdue).length,
    dueSoon: tasks.filter((task) => isDueSoon(task.dueDate) && !isOverdue(task)).length,
  };
}

export class TaskService {
  constructor(private readonly db: DatabaseClient) {}

  private async findMemberById(memberId: string): Promise<{ id: string; name: string } | undefined> {
    return this.db.get<{ id: string; name: string }>(
      `
        SELECT id, name
        FROM members
        WHERE id = ?
      `,
      [memberId],
    );
  }

  private async findMemberByName(name: string): Promise<{ id: string; name: string } | undefined> {
    return this.db.get<{ id: string; name: string }>(
      `
        SELECT id, name
        FROM members
        WHERE name = ?
        LIMIT 1
      `,
      [name],
    );
  }

  private async resolveOwnerReference(input: {
    ownerMemberId?: string | null;
    ownerName?: string | null;
  }): Promise<{ ownerMemberId: string | null; ownerName: string | null }> {
    if (input.ownerMemberId) {
      const member = await this.findMemberById(input.ownerMemberId);
      if (!member) {
        throw new NotFoundError(`Member ${input.ownerMemberId} not found.`);
      }

      return {
        ownerMemberId: member.id,
        ownerName: member.name,
      };
    }

    if (input.ownerName) {
      const normalizedName = input.ownerName.trim();
      if (!normalizedName) {
        return { ownerMemberId: null, ownerName: null };
      }

      const member = await this.findMemberByName(normalizedName);
      return {
        ownerMemberId: member?.id ?? null,
        ownerName: member?.name ?? normalizedName,
      };
    }

    return {
      ownerMemberId: null,
      ownerName: null,
    };
  }

  private async getTaskRowById(taskId: string): Promise<TaskRow | undefined> {
    return this.db.get<TaskRow>(
      `
        SELECT
          id,
          source_action_item_id,
          meeting_id,
          owner_member_id,
          title,
          description,
          owner_name,
          due_date,
          priority,
          status,
          acceptance_criteria,
          source_text,
          source_timestamp,
          confidence,
          tags,
          created_at,
          updated_at
        FROM tasks
        WHERE id = ?
      `,
      [taskId],
    );
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const title = input.title?.trim();
    const description = input.description?.trim();

    if (!title) {
      throw new ValidationError('Task title is required.');
    }

    if (!description) {
      throw new ValidationError('Task description is required.');
    }

    if (input.priority !== undefined && !isTaskPriority(input.priority)) {
      throw new ValidationError('Task priority must be low, medium or high.');
    }

    if (input.status !== undefined && !isTaskStatus(input.status)) {
      throw new ValidationError('Task status must be todo, doing or done.');
    }

    if (
      input.confidence !== undefined
      && (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1)
    ) {
      throw new ValidationError('Task confidence must be a number between 0 and 1.');
    }

    const owner = await this.resolveOwnerReference({
      ownerMemberId: input.ownerMemberId,
      ownerName: input.ownerName,
    });
    const sourceActionItemId = input.sourceActionItemId?.trim() || createManualTaskSourceActionItemId();
    const createdAt = new Date().toISOString();
    const task: Task = {
      id: createTaskId(sourceActionItemId),
      sourceActionItemId,
      meetingId: input.meetingId ?? null,
      ownerMemberId: owner.ownerMemberId,
      title,
      description,
      ownerName: owner.ownerName,
      dueDate: normalizeNullableText(input.dueDate),
      priority: input.priority ?? 'medium',
      status: input.status ?? 'todo',
      acceptanceCriteria: normalizeNullableText(input.acceptanceCriteria),
      sourceText: normalizeNullableText(input.sourceText) ?? description,
      sourceTimestamp: normalizeNullableText(input.sourceTimestamp),
      confidence: input.confidence ?? 1,
      tags: normalizeTags(input.tags),
      createdAt,
      updatedAt: createdAt,
    };

    await this.db.run(
      `
        INSERT INTO tasks (
          id,
          source_action_item_id,
          meeting_id,
          owner_member_id,
          title,
          description,
          owner_name,
          due_date,
          priority,
          status,
          acceptance_criteria,
          source_text,
          source_timestamp,
          confidence,
          tags,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        task.id,
        task.sourceActionItemId,
        task.meetingId,
        task.ownerMemberId,
        task.title,
        task.description,
        task.ownerName,
        task.dueDate,
        task.priority,
        task.status,
        task.acceptanceCriteria,
        task.sourceText,
        task.sourceTimestamp,
        task.confidence,
        JSON.stringify(task.tags),
        task.createdAt,
        task.updatedAt,
      ],
    );

    await this.db.run(
      `
        INSERT INTO task_activity_logs (
          id,
          task_id,
          action_type,
          action_detail,
          operator_name,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        createRuntimeLogId(task.id),
        task.id,
        'created',
        '手动创建任务。',
        input.operatorName ?? 'system',
        createdAt,
      ],
    );

    return task;
  }

  async importFromActionItems(input: ImportActionItemsInput): Promise<Task[]> {
    const createdTasks: Task[] = [];
    const operatorName = input.operatorName ?? 'system';

    for (const [index, actionItem] of input.actionItems.entries()) {
      const taskId = createTaskId(actionItem.id);
      const createdAt = new Date().toISOString();
      const owner = await this.resolveOwnerReference({
        ownerMemberId: actionItem.ownerMemberId,
        ownerName: actionItem.ownerName,
      });
      const task: Task = {
        id: taskId,
        sourceActionItemId: actionItem.id,
        meetingId: input.meetingId ?? null,
        ownerMemberId: owner.ownerMemberId,
        title: actionItem.title,
        description: actionItem.description,
        ownerName: owner.ownerName,
        dueDate: actionItem.dueDate,
        priority: actionItem.priority,
        status: actionItem.status,
        acceptanceCriteria: actionItem.acceptanceCriteria,
        sourceText: actionItem.sourceText,
        sourceTimestamp: actionItem.sourceTimestamp,
        confidence: actionItem.confidence,
        tags: actionItem.tags,
        createdAt,
        updatedAt: createdAt,
      };

      await this.db.run(
        `
          INSERT OR REPLACE INTO tasks (
            id,
            source_action_item_id,
            meeting_id,
            owner_member_id,
            title,
            description,
            owner_name,
            due_date,
            priority,
            status,
            acceptance_criteria,
            source_text,
            source_timestamp,
            confidence,
            tags,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          task.id,
          task.sourceActionItemId,
          task.meetingId,
          task.ownerMemberId,
          task.title,
          task.description,
          task.ownerName,
          task.dueDate,
          task.priority,
          task.status,
          task.acceptanceCriteria,
          task.sourceText,
          task.sourceTimestamp,
          task.confidence,
          JSON.stringify(task.tags),
          task.createdAt,
          task.updatedAt,
        ],
      );

      await this.db.run(
        `
          INSERT OR REPLACE INTO task_activity_logs (
            id,
            task_id,
            action_type,
            action_detail,
            operator_name,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          createLogId(taskId, index),
          taskId,
          'created',
          '根据 actionItems 自动创建任务。',
          operatorName,
          createdAt,
        ],
      );

      createdTasks.push(task);
    }

    return createdTasks;
  }

  async listTasks(query: ListTasksQuery = {}): Promise<ListTasksResult> {
    if (query.status !== undefined && !isTaskStatus(query.status)) {
      throw new ValidationError('Task status must be todo, doing or done.');
    }

    if (query.page !== undefined && (!Number.isInteger(query.page) || query.page < 1)) {
      throw new ValidationError('Task page must be a positive integer.');
    }

    if (query.pageSize !== undefined && (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 100)) {
      throw new ValidationError('Task pageSize must be an integer between 1 and 100.');
    }

    const filters: string[] = [];
    const params: DatabaseParameter[] = [];
    const keyword = query.keyword?.trim();

    if (query.status) {
      filters.push('status = ?');
      params.push(query.status);
    }

    if (query.ownerName) {
      filters.push('owner_name = ?');
      params.push(query.ownerName);
    }

    if (query.ownerMemberId) {
      filters.push('owner_member_id = ?');
      params.push(query.ownerMemberId);
    }

    if (query.meetingId) {
      filters.push('meeting_id = ?');
      params.push(query.meetingId);
    }

    if (keyword) {
      const likeKeyword = `%${keyword}%`;
      filters.push('(title LIKE ? OR description LIKE ? OR owner_name LIKE ? OR source_text LIKE ?)');
      params.push(likeKeyword, likeKeyword, likeKeyword, likeKeyword);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const totalRow = await this.db.get<{ total: number }>(
      `
        SELECT COUNT(*) AS total
        FROM tasks
        ${whereClause}
      `,
      params,
    );
    const total = totalRow?.total ?? 0;
    const usePagination = query.page !== undefined || query.pageSize !== undefined;
    const page = usePagination ? (query.page ?? 1) : 1;
    const pageSize = usePagination ? (query.pageSize ?? 20) : total;
    const paginationClause = usePagination ? 'LIMIT ? OFFSET ?' : '';
    const selectParams = [...params];

    if (usePagination) {
      selectParams.push(pageSize, (page - 1) * pageSize);
    }

    const rows = await this.db.all<TaskRow>(
      `
        SELECT
          id,
          source_action_item_id,
          meeting_id,
          owner_member_id,
          title,
          description,
          owner_name,
          due_date,
          priority,
          status,
          acceptance_criteria,
          source_text,
          source_timestamp,
          confidence,
          tags,
          created_at,
          updated_at
        FROM tasks
        ${whereClause}
        ORDER BY ${buildOrderClause(query.sortBy, query.sortOrder)}
        ${paginationClause}
      `,
      selectParams,
    );

    const items = rows.map(mapTaskRow);

    return {
      items,
      count: items.length,
      total,
      page,
      pageSize: usePagination ? pageSize : items.length,
    };
  }

  async getTaskById(taskId: string): Promise<Task> {
    const row = await this.getTaskRowById(taskId);

    if (!row) {
      throw new NotFoundError(`Task ${taskId} not found.`);
    }

    return mapTaskRow(row);
  }

  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
    const existingRow = await this.getTaskRowById(taskId);

    if (!existingRow) {
      throw new Error(`Task ${taskId} not found.`);
    }

    const existingTask = mapTaskRow(existingRow);
    const resolvedOwner = await this.resolveOwnerReference({
      ownerMemberId: input.ownerMemberId !== undefined ? input.ownerMemberId : existingTask.ownerMemberId,
      ownerName: input.ownerName !== undefined ? input.ownerName : existingTask.ownerName,
    });
    const nextTask: Task = {
      ...existingTask,
      title: input.title ?? existingTask.title,
      description: input.description ?? existingTask.description,
      ownerMemberId: resolvedOwner.ownerMemberId,
      ownerName: resolvedOwner.ownerName,
      dueDate: input.dueDate !== undefined ? input.dueDate : existingTask.dueDate,
      priority: input.priority ?? existingTask.priority,
      status: input.status ?? existingTask.status,
      acceptanceCriteria:
        input.acceptanceCriteria !== undefined ? input.acceptanceCriteria : existingTask.acceptanceCriteria,
      updatedAt: new Date().toISOString(),
    };

    await this.db.run(
      `
        UPDATE tasks
        SET
          title = ?,
          description = ?,
          owner_member_id = ?,
          owner_name = ?,
          due_date = ?,
          priority = ?,
          status = ?,
          acceptance_criteria = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        nextTask.title,
        nextTask.description,
        nextTask.ownerMemberId,
        nextTask.ownerName,
        nextTask.dueDate,
        nextTask.priority,
        nextTask.status,
        nextTask.acceptanceCriteria,
        nextTask.updatedAt,
        taskId,
      ],
    );

    const operatorName = input.operatorName ?? 'system';
    const logs: Array<{ actionType: TaskActivityLog['actionType']; actionDetail: string }> = [];

    if (existingTask.status !== nextTask.status) {
      logs.push({
        actionType: 'status_changed',
        actionDetail: `任务状态从 ${existingTask.status} 更新为 ${nextTask.status}。`,
      });
    }

    if (existingTask.ownerName !== nextTask.ownerName) {
      logs.push({
        actionType: 'owner_changed',
        actionDetail: `负责人从 ${existingTask.ownerName ?? '未指派'} 更新为 ${nextTask.ownerName ?? '未指派'}。`,
      });
    }

    if (existingTask.dueDate !== nextTask.dueDate) {
      logs.push({
        actionType: 'due_date_changed',
        actionDetail: `截止日期从 ${existingTask.dueDate ?? '未设置'} 更新为 ${nextTask.dueDate ?? '未设置'}。`,
      });
    }

    if (
      existingTask.title !== nextTask.title ||
      existingTask.description !== nextTask.description ||
      existingTask.priority !== nextTask.priority ||
      existingTask.acceptanceCriteria !== nextTask.acceptanceCriteria
    ) {
      logs.push({
        actionType: 'updated',
        actionDetail: '任务基础信息已更新。',
      });
    }

    for (const log of logs) {
      await this.db.run(
        `
          INSERT INTO task_activity_logs (
            id,
            task_id,
            action_type,
            action_detail,
            operator_name,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          createRuntimeLogId(taskId),
          taskId,
          log.actionType,
          log.actionDetail,
          operatorName,
          nextTask.updatedAt,
        ],
      );
    }

    return nextTask;
  }

  async getBoard(): Promise<BoardResponse> {
    const tasks = (await this.listTasks()).items;
    const columns: BoardResponse['columns'] = [
      {
        status: 'todo',
        title: 'To Do',
        items: tasks.filter((task) => task.status === 'todo'),
      },
      {
        status: 'doing',
        title: 'Doing',
        items: tasks.filter((task) => task.status === 'doing'),
      },
      {
        status: 'done',
        title: 'Done',
        items: tasks.filter((task) => task.status === 'done'),
      },
    ];

    return {
      columns,
      stats: buildBoardStats(tasks),
    };
  }

  async getBoardStats(): Promise<BoardStats> {
    const tasks = (await this.listTasks()).items;
    return buildBoardStats(tasks);
  }

  async listTaskActivity(taskId: string): Promise<TaskActivityLog[]> {
    const rows = await this.db.all<{
      id: string;
      task_id: string;
      action_type: TaskActivityLog['actionType'];
      action_detail: string;
      operator_name: string;
      created_at: string;
    }>(
      `
        SELECT
          id,
          task_id,
          action_type,
          action_detail,
          operator_name,
          created_at
        FROM task_activity_logs
        WHERE task_id = ?
        ORDER BY created_at ASC
      `,
      [taskId],
    );

    return rows.map((row) => ({
      id: row.id,
      taskId: row.task_id,
      actionType: row.action_type,
      actionDetail: row.action_detail,
      operatorName: row.operator_name,
      createdAt: row.created_at,
    }));
  }

  async deleteTask(taskId: string): Promise<{ deleted: true; id: string }> {
    const existingRow = await this.getTaskRowById(taskId);

    if (!existingRow) {
      throw new NotFoundError(`Task ${taskId} not found.`);
    }

    await this.db.run('DELETE FROM task_activity_logs WHERE task_id = ?', [taskId]);
    await this.db.run('DELETE FROM tasks WHERE id = ?', [taskId]);

    return {
      deleted: true,
      id: taskId,
    };
  }
}
