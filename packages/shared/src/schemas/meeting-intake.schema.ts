import {
  MEETING_INTAKE_PARSER_MODES,
  MEETING_INTAKE_SOURCE_TYPES,
  MEETING_INTAKE_STATUSES,
} from '../types/meeting-intake';
import { actionItemsPayloadSchema } from './action-item.schema';

export const meetingIntakeSchema = {
  type: 'object',
  required: [
    'id',
    'operatorName',
    'sourceType',
    'sourceContent',
    'normalizedContent',
    'parserMode',
    'parserEngine',
    'status',
    'actionItems',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
    },
    meetingId: {
      type: ['string', 'null'],
    },
    operatorName: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    sourceType: {
      type: 'string',
      enum: [...MEETING_INTAKE_SOURCE_TYPES],
    },
    sourceName: {
      type: ['string', 'null'],
      maxLength: 255,
    },
    sourceContent: {
      type: 'string',
      minLength: 1,
    },
    normalizedContent: {
      type: 'string',
      minLength: 1,
    },
    parserMode: {
      type: 'string',
      enum: [...MEETING_INTAKE_PARSER_MODES],
    },
    parserEngine: {
      type: 'string',
      minLength: 1,
      maxLength: 50,
    },
    status: {
      type: 'string',
      enum: [...MEETING_INTAKE_STATUSES],
    },
    summary: {
      type: ['string', 'null'],
    },
    actionItems: actionItemsPayloadSchema.properties.actionItems,
    errorMessage: {
      type: ['string', 'null'],
    },
    createdAt: {
      type: 'string',
    },
    updatedAt: {
      type: 'string',
    },
    parsedAt: {
      type: ['string', 'null'],
    },
    importedAt: {
      type: ['string', 'null'],
    },
  },
  additionalProperties: false,
} as const;
