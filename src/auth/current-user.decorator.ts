import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthTokenPayload } from './auth.types';
import { AuthenticatedRequest } from './auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthTokenPayload => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);