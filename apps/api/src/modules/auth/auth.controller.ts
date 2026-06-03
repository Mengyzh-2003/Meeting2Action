import type { LoginInput } from '../../../../../packages/shared/src';
import type { RequestLike, ResponseLike } from '../../http';
import { UnauthorizedError, ValidationError } from '../../errors';
import type { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (
    request: RequestLike<LoginInput>,
    response: ResponseLike,
  ): Promise<void> => {
    const username = request.body.username?.trim();
    const password = request.body.password?.trim();

    if (!username) {
      throw new ValidationError('username is required.');
    }

    if (!password) {
      throw new ValidationError('password is required.');
    }

    const session = await this.authService.login(username, password);
    response.status(200).json(session);
  };

  getCurrentUser = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    if (!request.auth) {
      throw new UnauthorizedError();
    }

    response.status(200).json(request.auth);
  };

  logout = async (
    request: RequestLike,
    response: ResponseLike,
  ): Promise<void> => {
    if (!request.auth) {
      throw new UnauthorizedError();
    }

    const result = await this.authService.logout(request.auth.token);
    response.status(200).json(result);
  };
}
