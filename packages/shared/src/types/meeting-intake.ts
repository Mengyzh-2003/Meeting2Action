import type { ActionItemsPayload } from './action-item';

export const MEETING_INTAKE_SOURCE_TYPES = ['text', 'file'] as const;
export const MEETING_INTAKE_STATUSES = ['parsed', 'failed', 'imported'] as const;
export const MEETING_INTAKE_PARSER_MODES = ['auto', 'heuristic', 'llm'] as const;

export type MeetingIntakeSourceType = (typeof MEETING_INTAKE_SOURCE_TYPES)[number];
export type MeetingIntakeStatus = (typeof MEETING_INTAKE_STATUSES)[number];
export type MeetingIntakeParserMode = (typeof MEETING_INTAKE_PARSER_MODES)[number];

export interface MeetingIntake {
  id: string;
  meetingId: string | null;
  operatorName: string;
  sourceType: MeetingIntakeSourceType;
  sourceName: string | null;
  sourceContent: string;
  normalizedContent: string;
  parserMode: MeetingIntakeParserMode;
  parserEngine: string;
  status: MeetingIntakeStatus;
  summary: string | null;
  actionItems: ActionItemsPayload['actionItems'];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  parsedAt: string | null;
  importedAt: string | null;
}

export interface ParseMeetingInput {
  meetingId?: string | null;
  operatorName?: string;
  sourceType?: MeetingIntakeSourceType;
  sourceName?: string | null;
  content: string;
  parserMode?: MeetingIntakeParserMode;
}

export interface ParseMeetingResponse {
  intake: MeetingIntake;
  payload: ActionItemsPayload;
}

export interface ImportMeetingIntakeInput {
  operatorName?: string;
}

export function isMeetingIntakeSourceType(value: unknown): value is MeetingIntakeSourceType {
  return typeof value === 'string' && MEETING_INTAKE_SOURCE_TYPES.includes(value as MeetingIntakeSourceType);
}

export function isMeetingIntakeStatus(value: unknown): value is MeetingIntakeStatus {
  return typeof value === 'string' && MEETING_INTAKE_STATUSES.includes(value as MeetingIntakeStatus);
}

export function isMeetingIntakeParserMode(value: unknown): value is MeetingIntakeParserMode {
  return typeof value === 'string' && MEETING_INTAKE_PARSER_MODES.includes(value as MeetingIntakeParserMode);
}
