import type {
  CreateMeetingInput,
  Meeting,
  MeetingParticipant,
  MemberSummary,
  UpdateMeetingParticipantsInput,
  UpdateMeetingInput,
} from '../../../../../packages/shared/src';
import type { DatabaseClient, DatabaseParameter } from '../../db/database-client';
import { NotFoundError, ValidationError } from '../../errors';

type MeetingRow = {
  id: string;
  topic: string;
  meeting_time: string;
  location: string | null;
  created_at: string;
  updated_at: string;
};

type ParticipantRow = {
  meeting_id: string;
  member_id: string;
  created_at: string;
  id: string;
  name: string;
  grade: string;
  degree_type: MemberSummary['degreeType'];
};

function mapParticipantRow(row: ParticipantRow): MemberSummary {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    degreeType: row.degree_type,
  };
}

function createMeetingId(): string {
  return `meeting_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeLocation(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeParticipantIds(participantIds: string[]): string[] {
  return Array.from(
    new Set(participantIds.map((participantId) => participantId.trim()).filter((participantId) => participantId.length > 0)),
  );
}

export class MeetingService {
  constructor(private readonly db: DatabaseClient) {}

  private async getMeetingRowById(meetingId: string): Promise<MeetingRow | undefined> {
    return this.db.get<MeetingRow>(
      `
        SELECT
          id,
          topic,
          meeting_time,
          location,
          created_at,
          updated_at
        FROM meetings
        WHERE id = ?
      `,
      [meetingId],
    );
  }

  private async getParticipantsMap(meetingIds: string[]): Promise<Map<string, MemberSummary[]>> {
    const participantsMap = new Map<string, MemberSummary[]>();

    if (meetingIds.length === 0) {
      return participantsMap;
    }

    const placeholders = meetingIds.map(() => '?').join(', ');
    const rows = await this.db.all<ParticipantRow>(
      `
        SELECT
          mp.meeting_id,
          mp.member_id,
          mp.created_at,
          m.id,
          m.name,
          m.grade,
          m.degree_type
        FROM meeting_participants mp
        INNER JOIN members m ON m.id = mp.member_id
        WHERE mp.meeting_id IN (${placeholders})
        ORDER BY m.created_at DESC, m.name ASC
      `,
      meetingIds as DatabaseParameter[],
    );

    for (const row of rows) {
      const participants = participantsMap.get(row.meeting_id) ?? [];
      participants.push(mapParticipantRow(row));
      participantsMap.set(row.meeting_id, participants);
    }

    return participantsMap;
  }

  private mapMeeting(row: MeetingRow, participants: MemberSummary[]): Meeting {
    return {
      id: row.id,
      topic: row.topic,
      meetingTime: row.meeting_time,
      location: row.location,
      participants,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async assertParticipantsExist(participantIds: string[]): Promise<void> {
    if (participantIds.length === 0) {
      return;
    }

    const placeholders = participantIds.map(() => '?').join(', ');
    const rows = await this.db.all<{ id: string }>(
      `
        SELECT id
        FROM members
        WHERE id IN (${placeholders})
      `,
      participantIds as DatabaseParameter[],
    );

    const existingIds = new Set(rows.map((row) => row.id));
    const missingIds = participantIds.filter((participantId) => !existingIds.has(participantId));

    if (missingIds.length > 0) {
      throw new ValidationError(`Participant members not found: ${missingIds.join(', ')}`);
    }
  }

  private async replaceMeetingParticipants(meetingId: string, participantIds: string[]): Promise<void> {
    await this.db.run('DELETE FROM meeting_participants WHERE meeting_id = ?', [meetingId]);

    for (const participantId of participantIds) {
      await this.db.run(
        `
          INSERT INTO meeting_participants (
            meeting_id,
            member_id
          ) VALUES (?, ?)
        `,
        [meetingId, participantId],
      );
    }
  }

  private async assertMeetingExists(meetingId: string): Promise<void> {
    const row = await this.getMeetingRowById(meetingId);

    if (!row) {
      throw new NotFoundError(`Meeting ${meetingId} not found.`);
    }
  }

  async listMeetingParticipants(meetingId: string): Promise<MeetingParticipant[]> {
    await this.assertMeetingExists(meetingId);

    const rows = await this.db.all<ParticipantRow>(
      `
        SELECT
          mp.meeting_id,
          mp.member_id,
          mp.created_at,
          m.id,
          m.name,
          m.grade,
          m.degree_type
        FROM meeting_participants mp
        INNER JOIN members m ON m.id = mp.member_id
        WHERE mp.meeting_id = ?
        ORDER BY mp.created_at ASC, m.name ASC
      `,
      [meetingId],
    );

    return rows.map((row) => ({
      meetingId: row.meeting_id,
      memberId: row.member_id,
      createdAt: row.created_at,
      member: mapParticipantRow(row),
    }));
  }

  async updateMeetingParticipants(
    meetingId: string,
    input: UpdateMeetingParticipantsInput,
  ): Promise<MeetingParticipant[]> {
    await this.assertMeetingExists(meetingId);

    const participantIds = normalizeParticipantIds(input.participantIds ?? []);
    await this.assertParticipantsExist(participantIds);
    await this.replaceMeetingParticipants(meetingId, participantIds);

    return this.listMeetingParticipants(meetingId);
  }

  async listMeetings(): Promise<Meeting[]> {
    const rows = await this.db.all<MeetingRow>(
      `
        SELECT
          id,
          topic,
          meeting_time,
          location,
          created_at,
          updated_at
        FROM meetings
        ORDER BY meeting_time DESC, created_at DESC
      `,
    );

    const participantsMap = await this.getParticipantsMap(rows.map((row) => row.id));
    return rows.map((row) => this.mapMeeting(row, participantsMap.get(row.id) ?? []));
  }

  async getMeetingById(meetingId: string): Promise<Meeting> {
    const row = await this.getMeetingRowById(meetingId);

    if (!row) {
      throw new NotFoundError(`Meeting ${meetingId} not found.`);
    }

    const participantsMap = await this.getParticipantsMap([meetingId]);
    return this.mapMeeting(row, participantsMap.get(meetingId) ?? []);
  }

  async createMeeting(input: CreateMeetingInput): Promise<Meeting> {
    const topic = input.topic?.trim();
    const meetingTime = input.meetingTime?.trim();
    const location = normalizeLocation(input.location);
    const participantIds = normalizeParticipantIds(input.participantIds ?? []);

    if (!topic) {
      throw new ValidationError('Meeting topic is required.');
    }

    if (!meetingTime) {
      throw new ValidationError('Meeting meetingTime is required.');
    }

    await this.assertParticipantsExist(participantIds);

    const meeting: Meeting = {
      id: createMeetingId(),
      topic,
      meetingTime,
      location,
      participants: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.run(
      `
        INSERT INTO meetings (
          id,
          topic,
          meeting_time,
          location,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [meeting.id, meeting.topic, meeting.meetingTime, meeting.location, meeting.createdAt, meeting.updatedAt],
    );

    await this.replaceMeetingParticipants(meeting.id, participantIds);

    return this.getMeetingById(meeting.id);
  }

  async updateMeeting(meetingId: string, input: UpdateMeetingInput): Promise<Meeting> {
    const existingRow = await this.getMeetingRowById(meetingId);

    if (!existingRow) {
      throw new NotFoundError(`Meeting ${meetingId} not found.`);
    }

    const nextTopic = input.topic !== undefined ? input.topic.trim() : existingRow.topic;
    const nextMeetingTime = input.meetingTime !== undefined ? input.meetingTime.trim() : existingRow.meeting_time;
    const nextLocation = input.location !== undefined ? normalizeLocation(input.location) : existingRow.location;

    if (!nextTopic) {
      throw new ValidationError('Meeting topic cannot be empty.');
    }

    if (!nextMeetingTime) {
      throw new ValidationError('Meeting meetingTime cannot be empty.');
    }

    const participantIds = input.participantIds !== undefined
      ? normalizeParticipantIds(input.participantIds)
      : undefined;

    if (participantIds) {
      await this.assertParticipantsExist(participantIds);
    }

    const updatedAt = new Date().toISOString();

    await this.db.run(
      `
        UPDATE meetings
        SET
          topic = ?,
          meeting_time = ?,
          location = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [nextTopic, nextMeetingTime, nextLocation, updatedAt, meetingId],
    );

    if (participantIds) {
      await this.replaceMeetingParticipants(meetingId, participantIds);
    }

    return this.getMeetingById(meetingId);
  }

  async deleteMeeting(meetingId: string): Promise<{ deleted: true; id: string }> {
    await this.assertMeetingExists(meetingId);

    await this.db.run('DELETE FROM meeting_participants WHERE meeting_id = ?', [meetingId]);
    await this.db.run('UPDATE tasks SET meeting_id = NULL WHERE meeting_id = ?', [meetingId]);
    await this.db.run('DELETE FROM meetings WHERE id = ?', [meetingId]);

    return {
      deleted: true,
      id: meetingId,
    };
  }
}