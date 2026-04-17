import type { RouteDefinition } from '../../http';
import type { MeetingController } from './meeting.controller';

export function createMeetingRoutes(meetingController: MeetingController): RouteDefinition[] {
  return [
    {
      method: 'GET',
      pattern: /^\/api\/meetings$/,
      handler: meetingController.listMeetings,
    },
    {
      method: 'GET',
      pattern: /^\/api\/meetings\/([^/]+)\/participants$/,
      handler: meetingController.listMeetingParticipants,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/meetings\/([^/]+)\/participants$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'GET',
      pattern: /^\/api\/meetings\/([^/]+)$/,
      handler: meetingController.getMeetingById,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/meetings\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'POST',
      pattern: /^\/api\/meetings$/,
      handler: meetingController.createMeeting,
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/meetings\/([^/]+)\/participants$/,
      handler: meetingController.updateMeetingParticipants,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/meetings\/([^/]+)\/participants$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'PATCH',
      pattern: /^\/api\/meetings\/([^/]+)$/,
      handler: meetingController.updateMeeting,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/meetings\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
    {
      method: 'DELETE',
      pattern: /^\/api\/meetings\/([^/]+)$/,
      handler: meetingController.deleteMeeting,
      getParams: (pathname) => {
        const match = pathname.match(/^\/api\/meetings\/([^/]+)$/);
        return { id: match?.[1] ?? '' };
      },
    },
  ];
}