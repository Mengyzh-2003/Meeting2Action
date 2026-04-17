import {
  ACTION_ITEM_PRIORITIES,
  ACTION_ITEM_STATUSES,
} from '../types/action-item';

export const actionItemSchema = {
  type: 'object',
  required: [
    'id',
    'title',
    'description',
    'priority',
    'status',
    'sourceText',
    'confidence',
    'tags',
  ],
  properties: {
    id: {
      type: 'string',
      minLength: 1,
    },
    title: {
      type: 'string',
      minLength: 1,
      maxLength: 120,
    },
    description: {
      type: 'string',
      minLength: 1,
      maxLength: 1000,
    },
    ownerName: {
      type: ['string', 'null'],
      maxLength: 50,
    },
    dueDate: {
      type: ['string', 'null'],
      format: 'date',
    },
    priority: {
      type: 'string',
      enum: [...ACTION_ITEM_PRIORITIES],
    },
    status: {
      type: 'string',
      enum: [...ACTION_ITEM_STATUSES],
    },
    acceptanceCriteria: {
      type: ['string', 'null'],
      maxLength: 500,
    },
    sourceText: {
      type: 'string',
      minLength: 1,
      maxLength: 1000,
    },
    sourceTimestamp: {
      type: ['string', 'null'],
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    tags: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 30,
      },
    },
  },
  additionalProperties: false,
} as const;

export const actionItemsPayloadSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'ActionItemsPayload',
  type: 'object',
  required: ['summary', 'actionItems'],
  properties: {
    summary: {
      type: 'string',
      minLength: 1,
    },
    actionItems: {
      type: 'array',
      items: actionItemSchema,
    },
  },
  additionalProperties: false,
} as const;