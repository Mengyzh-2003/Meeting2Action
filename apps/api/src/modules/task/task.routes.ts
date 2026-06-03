import type { RouteDefinition } from '../../http';
import { TaskController } from './task.controller';

export function createTaskRoutes(taskController: TaskController): RouteDefinition[] {
  return [
    {
      method: 'POST',
      pattern: /^\/api\/tasks$/,
      handler: taskController.createTask,
      requireAuth: true,
    },
    {
      method: 'POST',
      pattern: /^\/api\/tasks\/import-from-action-items$/,
      handler: taskController.importFromActionItems,
      requireAuth: true,
    },
    {
      method: 'GET',
      pattern: /^\/api\/tasks$/,
      handler: taskController.listTasks,
    },
    {
      method: 'GET',
      pattern: /^\/api\/tasks\/([^/]+)\/activity$/,
      handler: taskController.listTaskActivity,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/tasks\/([^/]+)\/activity$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/tasks\/([^/]+)$/,
      handler: taskController.getTaskById,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/tasks\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/tasks\/([^/]+)$/,
      handler: taskController.updateTask,
      requireAuth: true,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/tasks\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/tasks\/([^/]+)$/,
      handler: taskController.deleteTask,
      requireAuth: true,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/tasks\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/board\/stats$/,
      handler: taskController.getBoardStats,
    },
    {
      method: 'GET',
      pattern: /^\/api\/board$/,
      handler: taskController.getBoard,
    },
  ];
}
