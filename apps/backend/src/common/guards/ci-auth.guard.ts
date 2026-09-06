import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CiAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-api-key'];
    const expected = this.configService.get<string>('CI_API_KEY');
    if (!expected || typeof key !== 'string' || key.length === 0) {
      throw new UnauthorizedException(
        'Missing x-api-key header or CI_API_KEY is not configured',
      );
    }
    const provided = Buffer.from(key);
    const secret = Buffer.from(expected);
    if (
      provided.length !== secret.length ||
      !crypto.timingSafeEqual(provided, secret)
    ) {
      throw new UnauthorizedException('Invalid CI API key');
    }
    return true;
  }
}