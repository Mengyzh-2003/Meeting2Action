export interface Meeting {
  id: string;
  topic: string;
  meetingTime: string;
  location: string | null;
  participants: MemberSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface MemberSummary {
  id: string;
  name: string;
  studentId: string;
  degreeType: 'master' | 'phd';
}

export interface CreateMeetingInput {
  topic: string;
  meetingTime: string;
  location?: string | null;
  participantIds: string[];
}

export interface UpdateMeetingInput {
  topic?: string;
  meetingTime?: string;
  location?: string | null;
  participantIds?: string[];
}

export interface MeetingParticipant {
  meetingId: string;
  memberId: string;
  createdAt: string;
  member: MemberSummary;
}

export interface UpdateMeetingParticipantsInput {
  participantIds: string[];
}