import type { CreateMemberInput, Member, UpdateMemberInput } from '../../../../../packages/shared/src';
import { isMemberDegreeType } from '../../../../../packages/shared/src';
import type { DatabaseClient, DatabaseParameter } from '../../db/database-client';
import { NotFoundError, ValidationError } from '../../errors';

type MemberRow = {
  id: string;
  name: string;
  grade: string;
  degree_type: Member['degreeType'];
  created_at: string;
  updated_at: string;
};

function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    degreeType: row.degree_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createMemberId(): string {
  return `member_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.trim();
}

export class MemberService {
  constructor(private readonly db: DatabaseClient) {}

  private async getMemberRowById(memberId: string): Promise<MemberRow | undefined> {
    return this.db.get<MemberRow>(
      `
        SELECT
          id,
          name,
          grade,
          degree_type,
          created_at,
          updated_at
        FROM members
        WHERE id = ?
      `,
      [memberId],
    );
  }

  async listMembers(): Promise<Member[]> {
    const rows = await this.db.all<MemberRow>(
      `
        SELECT
          id,
          name,
          grade,
          degree_type,
          created_at,
          updated_at
        FROM members
        ORDER BY created_at DESC, name ASC
      `,
    );

    return rows.map(mapMemberRow);
  }

  async getMemberById(memberId: string): Promise<Member> {
    const row = await this.getMemberRowById(memberId);

    if (!row) {
      throw new NotFoundError(`Member ${memberId} not found.`);
    }

    return mapMemberRow(row);
  }

  async createMember(input: CreateMemberInput): Promise<Member> {
    const name = input.name?.trim();
    const grade = input.grade?.trim();

    if (!name) {
      throw new ValidationError('Member name is required.');
    }

    if (!grade) {
      throw new ValidationError('Member grade is required.');
    }

    if (!isMemberDegreeType(input.degreeType)) {
      throw new ValidationError('Member degreeType must be master or phd.');
    }

    const member: Member = {
      id: createMemberId(),
      name,
      grade,
      degreeType: input.degreeType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.run(
      `
        INSERT INTO members (
          id,
          name,
          grade,
          degree_type,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [member.id, member.name, member.grade, member.degreeType, member.createdAt, member.updatedAt],
    );

    return member;
  }

  async updateMember(memberId: string, input: UpdateMemberInput): Promise<Member> {
    const existingRow = await this.getMemberRowById(memberId);

    if (!existingRow) {
      throw new NotFoundError(`Member ${memberId} not found.`);
    }

    if (input.degreeType !== undefined && !isMemberDegreeType(input.degreeType)) {
      throw new ValidationError('Member degreeType must be master or phd.');
    }

    const nextName = normalizeOptionalText(input.name);
    const nextGrade = normalizeOptionalText(input.grade);

    if (nextName !== undefined && nextName.length === 0) {
      throw new ValidationError('Member name cannot be empty.');
    }

    if (nextGrade !== undefined && nextGrade.length === 0) {
      throw new ValidationError('Member grade cannot be empty.');
    }

    const existingMember = mapMemberRow(existingRow);
    const updatedMember: Member = {
      ...existingMember,
      name: nextName ?? existingMember.name,
      grade: nextGrade ?? existingMember.grade,
      degreeType: input.degreeType ?? existingMember.degreeType,
      updatedAt: new Date().toISOString(),
    };

    await this.db.run(
      `
        UPDATE members
        SET
          name = ?,
          grade = ?,
          degree_type = ?,
          updated_at = ?
        WHERE id = ?
      `,
      [
        updatedMember.name,
        updatedMember.grade,
        updatedMember.degreeType,
        updatedMember.updatedAt,
        memberId,
      ],
    );

    await this.db.run(
      `
        UPDATE tasks
        SET owner_name = ?
        WHERE owner_member_id = ?
      `,
      [updatedMember.name, memberId],
    );

    return updatedMember;
  }

  async deleteMember(memberId: string): Promise<{ deleted: true; id: string }> {
    const existingRow = await this.getMemberRowById(memberId);

    if (!existingRow) {
      throw new NotFoundError(`Member ${memberId} not found.`);
    }

    await this.db.run('DELETE FROM meeting_participants WHERE member_id = ?', [memberId]);
    await this.db.run('UPDATE tasks SET owner_member_id = NULL WHERE owner_member_id = ?', [memberId]);
    await this.db.run('DELETE FROM members WHERE id = ?', [memberId]);

    return {
      deleted: true,
      id: memberId,
    };
  }

  async listMembersByIds(memberIds: string[]): Promise<Member[]> {
    if (memberIds.length === 0) {
      return [];
    }

    const placeholders = memberIds.map(() => '?').join(', ');
    const rows = await this.db.all<MemberRow>(
      `
        SELECT
          id,
          name,
          grade,
          degree_type,
          created_at,
          updated_at
        FROM members
        WHERE id IN (${placeholders})
      `,
      memberIds as DatabaseParameter[],
    );

    return rows.map(mapMemberRow);
  }
}
