import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@rscb/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Menegakkan @Roles() di endpoint. Role dibaca dari JWT (claim `role`) —
 * perubahan role berlaku pada login berikutnya, bukan token berjalan.
 * Proteksi "tidak boleh mencabut ADMIN terakhir" ditangani di
 * AuthService, bukan di sini.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: UserRole } | undefined;
    if (!user?.role || !required.includes(user.role)) {
      throw new ForbiddenException(
        `Requires role: ${required.join(' or ')}`,
      );
    }
    return true;
  }
}
