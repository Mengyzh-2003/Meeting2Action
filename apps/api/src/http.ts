export interface RequestLike<TBody = unknown, TQuery = Record<string, string | undefined>> {
  body: TBody;
  query: TQuery;
  params: Record<string, string>;
}

export interface ResponseLike {
  status(code: number): ResponseLike;
  json(payload: unknown): void;
}

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  pattern: RegExp;
  handler: (request: RequestLike<any, Record<string, string | undefined>>, response: ResponseLike) => Promise<void>;
  getParams?: (pathname: string) => Record<string, string>;
}