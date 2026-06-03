import type { CreateMemberInput, UpdateMemberInput } from '../../../../../packages/shared/src';
import type { RequestLike, ResponseLike } from '../../http';
import { UnauthorizedError } from '../../errors';
import type { MemberService } from './member.service';

export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  getMemberStatus = async (
    _request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const count = await this.memberService.countMembers();
    response.status(200).json({ hasMembers: count > 0, count });
  };

  listMembers = async (
    _request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const members = await this.memberService.listMembers();
    response.status(200).json({ items: members, count: members.length });
  };

  getMemberById = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const member = await this.memberService.getMemberById(request.params.id);
    response.status(200).json(member);
  };

  createMember = async (
    request: RequestLike<CreateMemberInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const memberCount = await this.memberService.countMembers();
    if (memberCount > 0 && !request.auth) {
      throw new UnauthorizedError('请先登录后再创建成员。');
    }

    const member = await this.memberService.createMember(request.body);
    response.status(201).json(member);
  };

  updateMember = async (
    request: RequestLike<UpdateMemberInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const member = await this.memberService.updateMember(request.params.id, request.body);
    response.status(200).json(member);
  };

  deleteMember = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const result = await this.memberService.deleteMember(request.params.id);
    response.status(200).json(result);
  };
}
