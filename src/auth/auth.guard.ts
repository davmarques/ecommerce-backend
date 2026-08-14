import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from './token.service';
import { AuthTokenPayload } from './auth.types';

export interface AuthenticatedRequest extends Request {
  user: AuthTokenPayload;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Autenticacao obrigatoria.');
    }

    const token = authHeader.slice(7).trim();
    request.user = this.tokenService.verify(token);

    return true;
  }
}