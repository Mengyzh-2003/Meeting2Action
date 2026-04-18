import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { HttpError } from './errors';
import type { RequestLike, ResponseLike, RouteDefinition } from './http';
import { createSqliteDatabaseClient } from './db/sqlite-client';
import { MeetingController } from './modules/meeting/meeting.controller';
import { createMeetingRoutes } from './modules/meeting/meeting.routes';
import { MeetingService } from './modules/meeting/meeting.service';
import { IntakeController } from './modules/intake/intake.controller';
import { createIntakeRoutes } from './modules/intake/intake.routes';
import { IntakeService } from './modules/intake/intake.service';
import { MemberController } from './modules/member/member.controller';
import { createMemberRoutes } from './modules/member/member.routes';
import { MemberService } from './modules/member/member.service';
import { TaskController } from './modules/task/task.controller';
import { createTaskRoutes } from './modules/task/task.routes';
import { TaskService } from './modules/task/task.service';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

class HttpResponseAdapter implements ResponseLike {
  private statusCode = 200;

  constructor(private readonly response: ServerResponse) {}

  status(code: number): ResponseLike {
    this.statusCode = code;
    return this;
  }

  json(payload: unknown): void {
    const body = JSON.stringify(payload, null, 2);
    this.response.writeHead(this.statusCode, JSON_HEADERS);
    this.response.end(body);
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();
  return rawBody.length > 0 ? JSON.parse(rawBody) : {};
}

function createQueryObject(url: URL): Record<string, string | undefined> {
  const query: Record<string, string | undefined> = {};

  for (const [key, value] of url.searchParams.entries()) {
    query[key] = value;
  }

  return query;
}

function createRequestLike(
  pathname: string,
  body: unknown,
  url: URL,
  route: RouteDefinition,
): RequestLike {
  return {
    body,
    query: createQueryObject(url),
    params: route.getParams ? route.getParams(pathname) : {},
  };
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify(payload, null, 2));
}

async function bootstrap(): Promise<void> {
  const databaseClient = createSqliteDatabaseClient();
  const taskService = new TaskService(databaseClient);
  const memberService = new MemberService(databaseClient);
  const meetingService = new MeetingService(databaseClient);
  const intakeService = new IntakeService(databaseClient, taskService);
  const taskController = new TaskController(taskService);
  const memberController = new MemberController(memberService);
  const meetingController = new MeetingController(meetingService);
  const intakeController = new IntakeController(intakeService);
  const routes = [
    ...createTaskRoutes(taskController),
    ...createMemberRoutes(memberController),
    ...createMeetingRoutes(meetingController),
    ...createIntakeRoutes(intakeController),
  ];
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '127.0.0.1';

  const server = createServer(async (request, response) => {
    if (!request.url || !request.method) {
      sendJson(response, 400, { message: 'Invalid request.' });
      return;
    }

    if (request.method === 'OPTIONS') {
      response.writeHead(204, JSON_HEADERS);
      response.end();
      return;
    }

    const url = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
    const pathname = url.pathname;

    if (request.method === 'GET' && pathname === '/health') {
      sendJson(response, 200, {
        status: 'ok',
        service: 'meeting2action-api',
        database: 'sqlite',
      });
      return;
    }

    const route = routes.find((candidate) => {
      return candidate.method === request.method && candidate.pattern.test(pathname);
    });

    if (!route) {
      sendJson(response, 404, { message: 'Route not found.' });
      return;
    }

    try {
      const body = request.method === 'POST' || request.method === 'PATCH' || request.method === 'DELETE'
        ? await readJsonBody(request)
        : {};
      const requestLike = createRequestLike(pathname, body, url, route);
      const responseLike = new HttpResponseAdapter(response);

      await route.handler(requestLike, responseLike);
    } catch (error) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Unknown server error.';
      sendJson(response, statusCode, { message });
    }
  });

  server.listen(port, host, () => {
    console.log(`Meeting2Action API listening on http://${host}:${port}`);
    console.log('Health check: GET /health');
    console.log('Task routes: POST /api/tasks/import-from-action-items, GET /api/tasks, GET /api/tasks/:id, PATCH /api/tasks/:id, GET /api/tasks/:id/activity');
    console.log('Board routes: GET /api/board, GET /api/board/stats');
    console.log('Member routes: GET /api/members, GET /api/members/:id, POST /api/members, PATCH /api/members/:id, DELETE /api/members/:id');
    console.log('Meeting routes: GET /api/meetings, GET /api/meetings/:id, GET /api/meetings/:id/participants, POST /api/meetings, PATCH /api/meetings/:id, PATCH /api/meetings/:id/participants, DELETE /api/meetings/:id');
    console.log('Intake routes: GET /api/meeting-intakes, GET /api/meeting-intakes/:id, POST /api/meeting-intakes/parse, POST /api/meeting-intakes/:id/import-to-board');
  });
}

void bootstrap();
