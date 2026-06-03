import type {
  CreateTaskInput,
  ImportActionItemsInput,
  ListTasksQuery,
  UpdateTaskInput,
} from '../../../../../packages/shared/src';
import { isSortOrder, isTaskSortField, isTaskStatus } from '../../../../../packages/shared/src';
import type { RequestLike, ResponseLike } from '../../http';
import { ValidationError } from '../../errors';
import type { TaskService } from './task.service';

function parsePositiveInteger(value: string | undefined, fieldName: string): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }

  return parsed;
}

export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  createTask = async (
    request: RequestLike<CreateTaskInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const task = await this.taskService.createTask({
      ...request.body,
      operatorName: request.auth?.member.name ?? request.body.operatorName,
    });
    response.status(201).json(task);
  };

  importFromActionItems = async (
    request: RequestLike<ImportActionItemsInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const tasks = await this.taskService.importFromActionItems({
      ...request.body,
      operatorName: request.auth?.member.name ?? request.body.operatorName,
    });
    response.status(201).json({ items: tasks, count: tasks.length });
  };

  listTasks = async (
    request: RequestLike<unknown, Record<string, string | undefined>>,
    response: ResponseLike,
  ): Promise<void> => {
    if (request.query.status !== undefined && !isTaskStatus(request.query.status)) {
      throw new ValidationError('Task status must be todo, doing or done.');
    }

    if (request.query.sortBy !== undefined && !isTaskSortField(request.query.sortBy)) {
      throw new ValidationError('Task sortBy is invalid.');
    }

    if (request.query.sortOrder !== undefined && !isSortOrder(request.query.sortOrder)) {
      throw new ValidationError('Task sortOrder must be asc or desc.');
    }

    const query: ListTasksQuery = {
      status: request.query.status as ListTasksQuery['status'],
      ownerName: request.query.ownerName,
      ownerMemberId: request.query.ownerMemberId,
      meetingId: request.query.meetingId,
      keyword: request.query.keyword,
      sortBy: request.query.sortBy as ListTasksQuery['sortBy'],
      sortOrder: request.query.sortOrder as ListTasksQuery['sortOrder'],
      page: parsePositiveInteger(request.query.page, 'Task page'),
      pageSize: parsePositiveInteger(request.query.pageSize, 'Task pageSize'),
    };

    const result = await this.taskService.listTasks(query);
    response.status(200).json(result);
  };

  listTaskActivity = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const logs = await this.taskService.listTaskActivity(request.params.id);
    response.status(200).json({ items: logs, count: logs.length });
  };

  getTaskById = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const task = await this.taskService.getTaskById(request.params.id);
    response.status(200).json(task);
  };

  updateTask = async (
    request: RequestLike<UpdateTaskInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const task = await this.taskService.updateTask(request.params.id, {
      ...request.body,
      operatorName: request.auth?.member.name ?? request.body.operatorName,
    });
    response.status(200).json(task);
  };

  deleteTask = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const result = await this.taskService.deleteTask(request.params.id);
    response.status(200).json(result);
  };

  getBoard = async (
    _request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const board = await this.taskService.getBoard();
    response.status(200).json(board);
  };

  getBoardStats = async (
    _request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const stats = await this.taskService.getBoardStats();
    response.status(200).json(stats);
  };
}
