import { randomInt } from 'node:crypto';

import type { CreateMemberInput, CreatedMember, Member, UpdateMemberInput } from '../../../../../packages/shared/src';
import { isMemberDegreeType } from '../../../../../packages/shared/src';
import type { DatabaseClient, DatabaseParameter } from '../../db/database-client';
import { ConflictError, NotFoundError, ValidationError } from '../../errors';
import { hashPassword } from '../auth/password';

type MemberRow = {
  id: string;
  name: string;
  student_id: string;
  password: string;
  degree_type: Member['degreeType'];
  created_at: string;
  updated_at: string;
};

function generateSixDigitPassword(): string {
  return String(randomInt(100000, 1000000));
}

function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    studentId: row.student_id,
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

  async countMembers(): Promise<number> {
    const row = await this.db.get<{ total: number }>('SELECT COUNT(*) AS total FROM members');
    return row?.total ?? 0;
  }

  private async getMemberRowByName(memberName: string): Promise<MemberRow | undefined> {
    return this.db.get<MemberRow>(
      `
        SELECT
          id,
          name,
          student_id,
          password,
          degree_type,
          created_at,
          updated_at
        FROM members
        WHERE name = ?
      `,
      [memberName],
    );
  }

  private async getMemberRowByStudentId(studentId: string): Promise<MemberRow | undefined> {
    return this.db.get<MemberRow>(
      `
        SELECT
          id,
          name,
          student_id,
          password,
          degree_type,
          created_at,
          updated_at
        FROM members
        WHERE student_id = ?
      `,
      [studentId],
    );
  }

  private async getMemberRowById(memberId: string): Promise<MemberRow | undefined> {
    return this.db.get<MemberRow>(
      `
        SELECT
          id,
          name,
          student_id,
          password,
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
          student_id,
          password,
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

  async createMember(input: CreateMemberInput): Promise<CreatedMember> {
    const name = input.name?.trim();
    const studentId = input.studentId?.trim();

    if (!name) {
      throw new ValidationError('Member name is required.');
    }

    if (!studentId) {
      throw new ValidationError('Member studentId is required.');
    }

    if (!isMemberDegreeType(input.degreeType)) {
      throw new ValidationError('Member degreeType must be master or phd.');
    }

    const existingMember = await this.getMemberRowByName(name);
    if (existingMember) {
      throw new ConflictError(`Member ${name} already exists.`);
    }

    const existingStudentIdMember = await this.getMemberRowByStudentId(studentId);
    if (existingStudentIdMember) {
      throw new ConflictError(`Student ID ${studentId} already exists.`);
    }

    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    const initialPassword = generateSixDigitPassword();
    const member: Member = {
      id: createMemberId(),
      name,
      studentId,
      degreeType: input.degreeType,
      createdAt,
      updatedAt,
    };

    try {
      await this.db.run(
        `
          INSERT INTO members (
            id,
            name,
            student_id,
            password,
            degree_type,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          member.id,
          member.name,
          member.studentId,
          hashPassword(initialPassword),
          member.degreeType,
          member.createdAt,
          member.updatedAt,
        ],
      );
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed: members\.name/i.test(error.message)) {
        throw new ConflictError(`Member ${name} already exists.`);
      }

      if (error instanceof Error && /UNIQUE constraint failed: members\.student_id/i.test(error.message)) {
        throw new ConflictError(`Student ID ${studentId} already exists.`);
      }

      throw error;
    }

    return {
      ...member,
      initialPassword,
    };
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
    const nextStudentId = normalizeOptionalText(input.studentId);

    if (nextName !== undefined && nextName.length === 0) {
      throw new ValidationError('Member name cannot be empty.');
    }

    if (nextStudentId !== undefined && nextStudentId.length === 0) {
      throw new ValidationError('Member studentId cannot be empty.');
    }

    if (nextName !== undefined) {
      const existingMember = await this.getMemberRowByName(nextName);
      if (existingMember && existingMember.id !== memberId) {
        throw new ConflictError(`Member ${nextName} already exists.`);
      }
    }

    if (nextStudentId !== undefined) {
      const existingMember = await this.getMemberRowByStudentId(nextStudentId);
      if (existingMember && existingMember.id !== memberId) {
        throw new ConflictError(`Student ID ${nextStudentId} already exists.`);
      }
    }

    const existingMember = mapMemberRow(existingRow);
    const updatedMember: Member = {
      ...existingMember,
      name: nextName ?? existingMember.name,
      studentId: nextStudentId ?? existingMember.studentId,
      degreeType: input.degreeType ?? existingMember.degreeType,
      updatedAt: new Date().toISOString(),
    };

    try {
      await this.db.run(
        `
          UPDATE members
          SET
            name = ?,
            student_id = ?,
            degree_type = ?,
            updated_at = ?
          WHERE id = ?
        `,
        [
          updatedMember.name,
          updatedMember.studentId,
          updatedMember.degreeType,
          updatedMember.updatedAt,
          memberId,
        ],
      );
    } catch (error) {
      if (error instanceof Error && /UNIQUE constraint failed: members\.name/i.test(error.message)) {
        throw new ConflictError(`Member ${updatedMember.name} already exists.`);
      }

      if (error instanceof Error && /UNIQUE constraint failed: members\.student_id/i.test(error.message)) {
        throw new ConflictError(`Student ID ${updatedMember.studentId} already exists.`);
      }

      throw error;
    }

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
          student_id,
          password,
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
