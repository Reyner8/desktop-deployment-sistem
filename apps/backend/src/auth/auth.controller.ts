import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@rscb/shared';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '@rscb/shared';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  // Rate limit ketat khusus login untuk menahan brute force password;
  // angka 10/menit per IP masih longgar untuk penggunaan admin normal.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.username, dto.password);
    if (!user) {
      await this.auditService.log({
        actor: dto.username,
        action: AuditAction.USER_LOGIN,
        target: 'USER',
        details: { username: dto.username },
        result: 'FAILURE',
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    const result = await this.authService.login(user);
    await this.auditService.log({
      actor: user.username,
      action: AuditAction.USER_LOGIN,
      target: 'USER',
      targetId: user.id,
      result: 'SUCCESS',
    });
    return {
      success: true,
      token: result.accessToken,
      user: { username: user.username, displayName: user.displayName, role: user.role },
    };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async register(@Body() dto: RegisterDto, @CurrentUser() user: any) {
    const created = await this.authService.register(
      dto.username,
      dto.password,
      dto.displayName,
      dto.role,
    );
    await this.auditService.log({
      actor: user?.username || 'system',
      action: AuditAction.USER_REGISTERED,
      target: 'USER',
      targetId: created.id,
      details: { username: created.username, role: created.role },
      result: 'SUCCESS',
    });
    return { success: true, data: { id: created.id, username: created.username, role: created.role } };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listUsers() {
    const users = await this.authService.listUsers();
    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
    };
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    const updated = await this.authService.updateUserRole(id, dto.role);
    await this.auditService.log({
      actor: user?.username || 'unknown',
      action: AuditAction.USER_ROLE_CHANGED,
      target: 'USER',
      targetId: id,
      details: { username: updated.username, role: updated.role },
      result: 'SUCCESS',
    });
    return { success: true, data: { id: updated.id, username: updated.username, role: updated.role } };
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') id: string, @CurrentUser() user: any) {
    await this.authService.deleteUser(id, user?.username);
    await this.auditService.log({
      actor: user?.username || 'unknown',
      action: AuditAction.USER_DELETED,
      target: 'USER',
      targetId: id,
      result: 'SUCCESS',
    });
    return { success: true };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: any) {
    try {
      await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    } catch (error) {
      await this.auditService.log({
        actor: user?.username || 'unknown',
        action: AuditAction.USER_PASSWORD_CHANGED,
        target: 'USER',
        targetId: user?.id,
        result: 'FAILURE',
      });
      throw error;
    }
    await this.auditService.log({
      actor: user?.username || 'unknown',
      action: AuditAction.USER_PASSWORD_CHANGED,
      target: 'USER',
      targetId: user?.id,
      result: 'SUCCESS',
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.authService.getProfile(user.id);
    return {
      success: true,
      data: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        role: profile.role,
      },
    };
  }
}
