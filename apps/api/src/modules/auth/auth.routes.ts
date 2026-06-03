import type { RouteDefinition } from '../../http';
import type { AuthController } from './auth.controller';

export function createAuthRoutes(authController: AuthController): RouteDefinition[] {
  return [
    {
      method: 'POST',
      pattern: /^\/api\/auth\/login$/,
      handler: authController.login,
    },
    {
      method: 'POST',
      pattern: /^\/api\/auth\/logout$/,
      handler: authController.logout,
      requireAuth: true,
    },
    {
      method: 'GET',
      pattern: /^\/api\/users\/me$/,
      handler: authController.getCurrentUser,
      requireAuth: true,
    },
  ];
}