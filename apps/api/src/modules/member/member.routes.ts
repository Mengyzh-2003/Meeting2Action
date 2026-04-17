import type { RouteDefinition } from '../../http';
import type { MemberController } from './member.controller';

export function createMemberRoutes(memberController: MemberController): RouteDefinition[] {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/members$/,
      handler: memberController.listMembers,
    },
    {
      method: 'GET',
      pattern: /^\/api\/members\/([^/]+)$/,
      handler: memberController.getMemberById,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/members\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/members$/,
      handler: memberController.createMember,
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/members\/([^/]+)$/,
      handler: memberController.updateMember,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/members\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/members\/([^/]+)$/,
      handler: memberController.deleteMember,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/members\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
  ];
}