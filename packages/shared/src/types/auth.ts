import type { PublicMember } from './member';

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthSession {
  token: string;
  member: PublicMember;
  createdAt: string;
  expiresAt: string;
}
