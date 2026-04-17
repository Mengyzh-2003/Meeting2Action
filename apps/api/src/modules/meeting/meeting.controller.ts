import type {
  CreateMeetingInput,
  UpdateMeetingInput,
  UpdateMeetingParticipantsInput,
} from '../../../../../packages/shared/src';
import type { RequestLike, ResponseLike } from '../../http';
import type { MeetingService } from './meeting.service';

export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  listMeetings = async (
    _request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const meetings = await this.meetingService.listMeetings();
    response.status(200).json({ items: meetings, count: meetings.length });
  };

  getMeetingById = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const meeting = await this.meetingService.getMeetingById(request.params.id);
    response.status(200).json(meeting);
  };

  createMeeting = async (
    request: RequestLike<CreateMeetingInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const meeting = await this.meetingService.createMeeting(request.body);
    response.status(201).json(meeting);
  };

  updateMeeting = async (
    request: RequestLike<UpdateMeetingInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const meeting = await this.meetingService.updateMeeting(request.params.id, request.body);
    response.status(200).json(meeting);
  };

  listMeetingParticipants = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const participants = await this.meetingService.listMeetingParticipants(request.params.id);
    response.status(200).json({ items: participants, count: participants.length });
  };

  updateMeetingParticipants = async (
    request: RequestLike<UpdateMeetingParticipantsInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const participants = await this.meetingService.updateMeetingParticipants(request.params.id, request.body);
    response.status(200).json({ items: participants, count: participants.length });
  };

  deleteMeeting = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const result = await this.meetingService.deleteMeeting(request.params.id);
    response.status(200).json(result);
  };
}