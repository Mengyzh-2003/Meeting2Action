import { randomUUID } from 'node:crypto';

import type { AuthSession, PublicMember } from '../../../../../packages/shared/src';
import type { DatabaseClient } from '../../db/database-client';
import { UnauthorizedError } from '../../errors';
import type { AuthenticatedUser } from '../../http';
import { verifyPassword } from './password';

type SessionRow = {
  token: string;
  created_at: string;
  expires_at: string;
  id: string;
  name: string;
  student_id: string;
  degree_type: PublicMember['degreeType'];
  member_created_at: string;
  member_updated_at: string;
};

type CredentialRow = {
  id: string;
  name: string;
  student_id: string;
  degree_type: PublicMember['degreeType'];
  created_at: string;
  updated_at: string;
  password: string;
};

function mapMemberRow(row: SessionRow): PublicMember {
  return {
    id: row.id,
    name: row.name,
    studentId: row.student_id,
    degreeType: row.degree_type,
    createdAt: row.member_created_at,
    updatedAt: row.member_updated_at,
  };
}

export class AuthService {
  constructor(private readonly db: DatabaseClient) {}

  private async getMemberByCredentials(username: string, password: string): Promise<PublicMember | undefined> {
    const row = await this.db.get<CredentialRow>(
      `
        SELECT
          id,
          name,
          student_id,
          degree_type,
          created_at,
          updated_at,
          password
        FROM members
        WHERE name = ?
      `,
      [username],
    );

    if (!row || !verifyPassword(password, row.password)) {
      return undefined;
    }

    return {
      id: row.id,
      name: row.name,
      studentId: row.student_id,
      degreeType: row.degree_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async getSessionRowByToken(token: string): Promise<SessionRow | undefined> {
    return this.db.get<SessionRow>(
      `
        SELECT
          us.token,
          us.created_at,
          us.expires_at,
          m.id,
          m.name,
          m.student_id,
          m.degree_type,
          m.created_at AS member_created_at,
          m.updated_at AS member_updated_at
        FROM user_sessions us
        INNER JOIN members m ON m.id = us.member_id
        WHERE us.token = ?
      `,
      [token],
    );
  }

  async login(username: string, password: string): Promise<AuthSession> {
    const member = await this.getMemberByCredentials(username, password);
    if (!member) {
      throw new UnauthorizedError('用户名或密码错误。');
    }

    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
    const token = randomUUID();

    await this.db.run('DELETE FROM user_sessions WHERE member_id = ?', [member.id]);
    await this.db.run('DELETE FROM user_sessions WHERE expires_at <= ?', [createdAt]);
    await this.db.run(
      `
        INSERT INTO user_sessions (
          token,
          member_id,
          created_at,
          expires_at
        ) VALUES (?, ?, ?, ?)
      `,
      [token, member.id, createdAt, expiresAt],
    );

    return {
      token,
      member,
      createdAt,
      expiresAt,
    };
  }

  async getAuthenticatedUserByToken(token: string): Promise<AuthenticatedUser | undefined> {
    const row = await this.getSessionRowByToken(token);

    if (!row) {
      return undefined;
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      await this.db.run('DELETE FROM user_sessions WHERE token = ?', [token]);
      return undefined;
    }

    return {
      token: row.token,
      member: mapMemberRow(row),
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    };
  }

  async logout(token: string): Promise<{ loggedOut: true }> {
    await this.db.run('DELETE FROM user_sessions WHERE token = ?', [token]);
    return { loggedOut: true };
  }
}
