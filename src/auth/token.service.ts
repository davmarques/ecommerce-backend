import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { AuthTokenPayload } from './auth.types';

type TokenPayloadInput = Omit<AuthTokenPayload, 'exp'>;

@Injectable()
export class TokenService {
  private readonly secret = process.env.AUTH_SECRET || 'dev-auth-secret-change-me';
  private readonly expiresInSeconds = 60 * 60 * 24 * 7;

  sign(payload: TokenPayloadInput) {
    const fullPayload: AuthTokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + this.expiresInSeconds,
    };

    const encodedPayload = this.base64UrlEncode(JSON.stringify(fullPayload));
    const signature = this.signValue(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  verify(token: string) {
    const [encodedPayload, receivedSignature] = token.split('.');

    if (!encodedPayload || !receivedSignature) {
      throw new UnauthorizedException('Token de autenticacao invalido.');
    }

    const expectedSignature = this.signValue(encodedPayload);

    if (!this.safeCompare(receivedSignature, expectedSignature)) {
      throw new UnauthorizedException('Token de autenticacao invalido.');
    }

    let payload: AuthTokenPayload;

    try {
      payload = JSON.parse(this.base64UrlDecode(encodedPayload)) as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Token de autenticacao invalido.');
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Sessao expirada.');
    }

    return payload;
  }

  private signValue(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value, 'utf-8').toString('base64url');
  }

  private base64UrlDecode(value: string) {
    return Buffer.from(value, 'base64url').toString('utf-8');
  }

  private safeCompare(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}