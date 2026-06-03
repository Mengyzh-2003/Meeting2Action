import type { RouteDefinition } from '../../http';
import type { IntakeController } from './intake.controller';

export function createIntakeRoutes(intakeController: IntakeController): RouteDefinition[] {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/meeting-intakes$/,
      handler: intakeController.listIntakes,
    },
    {
      method: 'POST',
      pattern: /^\/api\/meeting-intakes\/parse$/,
      handler: intakeController.parseMeetingContent,
      requireAuth: true,
    },
    {
      method: 'POST',
      pattern: /^\/api\/meeting-intakes\/([^/]+)\/import-to-board$/,
      handler: intakeController.importToBoard,
      requireAuth: true,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/meeting-intakes\/([^/]+)\/import-to-board$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/meeting-intakes\/([^/]+)$/,
      handler: intakeController.getIntakeById,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/meeting-intakes\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/meeting-intakes\/([^/]+)$/,
      handler: intakeController.deleteIntake,
      requireAuth: true,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/meeting-intakes\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
  ];
}
