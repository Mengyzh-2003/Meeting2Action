export const MEMBER_DEGREE_TYPES = ['master', 'phd'] as const;

export type MemberDegreeType = (typeof MEMBER_DEGREE_TYPES)[number];

export interface Member {
  id: string;
  name: string;
  grade: string;
  degreeType: MemberDegreeType;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberInput {
  name: string;
  grade: string;
  degreeType: MemberDegreeType;
}

export interface UpdateMemberInput {
  name?: string;
  grade?: string;
  degreeType?: MemberDegreeType;
}

export function isMemberDegreeType(value: unknown): value is MemberDegreeType {
  return typeof value === 'string' && MEMBER_DEGREE_TYPES.includes(value as MemberDegreeType);
}