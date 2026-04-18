import type {
  ImportMeetingIntakeInput,
  ParseMeetingInput,
} from '../../../../../packages/shared/src';
import type { RequestLike, ResponseLike } from '../../http';
import type { IntakeService } from './intake.service';

export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  listIntakes = async (
    _request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const intakes = await this.intakeService.listIntakes();
    response.status(200).json({ items: intakes, count: intakes.length });
  };

  getIntakeById = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const intake = await this.intakeService.getIntakeById(request.params.id);
    response.status(200).json(intake);
  };

  parseMeetingContent = async (
    request: RequestLike<ParseMeetingInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const result = await this.intakeService.parseMeetingContent(request.body);
    response.status(201).json(result);
  };

  importToBoard = async (
    request: RequestLike<ImportMeetingIntakeInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const result = await this.intakeService.importToBoard(request.params.id, request.body);
    response.status(201).json(result);
  };

  deleteIntake = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    const result = await this.intakeService.deleteIntake(request.params.id);
    response.status(200).json(result);
  };
}
