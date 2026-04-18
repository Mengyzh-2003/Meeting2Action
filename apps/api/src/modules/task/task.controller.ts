import type {
  ImportActionItemsInput,
  ListTasksQuery,
  UpdateTaskInput,
} from '../../../../../packages/shared/src';
import type { RequestLike, ResponseLike } from '../../http';
import type { TaskService } from './task.service';

export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  importFromActionItems = async (
    request: RequestLike<ImportActionItemsInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const tasks = await this.taskService.importFromActionItems(request.body);
    response.status(201).json({ items: tasks, count: tasks.length });
  };

  listTasks = async (
    request: RequestLike<unknown, Record<string, string | undefined>>,
    response: ResponseLike,
  ): Promise<void> => {
    const query: ListTasksQuery = {
      status: request.query.status as ListTasksQuery['status'],
      ownerName: request.query.ownerName,
      ownerMemberId: request.query.ownerMemberId,
      meetingId: request.query.meetingId,
    };

    const tasks = await this.taskService.listTasks(query);
    response.status(200).json({ items: tasks, count: tasks.length });
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
    const task = await this.taskService.updateTask(request.params.id, request.body);
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
