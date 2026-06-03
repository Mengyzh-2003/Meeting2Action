export const MEMBER_DEGREE_TYPES = ['master', 'phd'] as const;

export type MemberDegreeType = (typeof MEMBER_DEGREE_TYPES)[number];

export interface PublicMember {
  id: string;
  name: string;
  studentId: string;
  degreeType: MemberDegreeType;
  createdAt: string;
  updatedAt: string;
}

export type Member = PublicMember;

export interface CreatedMember extends PublicMember {
  initialPassword: string;
}

export interface CreateMemberInput {
  name: string;
  studentId: string;
  degreeType: MemberDegreeType;
}

export interface UpdateMemberInput {
  name?: string;
  studentId?: string;
  degreeType?: MemberDegreeType;
}

export function isMemberDegreeType(value: unknown): value is MemberDegreeType {
  return typeof value === 'string' && MEMBER_DEGREE_TYPES.includes(value as MemberDegreeType);
}
