import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditAction } from '@rscb/shared';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
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
      user: { username: user.username, displayName: user.displayName },
    };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(@Body() dto: RegisterDto, @CurrentUser() user: any) {
    // Tabel users tidak punya kolom role, jadi otorisasi pembuatan user
    // dititipkan ke akun bootstrap admin dari ADMIN_USERNAME. Tanpa ini
    // setiap user yang berhasil login otomatis mendapat hak membuat user
    // lain. Model role yang sungguhan perlu keputusan terpisah karena
    // tidak ada taksonomi role di dokumentasi.
    const adminUsername = this.configService.get<string>('ADMIN_USERNAME') || 'admin';
    if (user?.username !== adminUsername) {
      await this.auditService.log({
        actor: user?.username || 'unknown',
        action: AuditAction.USER_REGISTERED,
        target: 'USER',
        details: { username: dto.username, reason: 'not authorized' },
        result: 'FAILURE',
      });
      throw new ForbiddenException('Only the administrator account may create users');
    }
    const created = await this.authService.register(dto.username, dto.password, dto.displayName);
    await this.auditService.log({
      actor: user?.username || 'system',
      action: AuditAction.USER_REGISTERED,
      target: 'USER',
      targetId: created.id,
      details: { username: created.username },
      result: 'SUCCESS',
    });
    return { success: true, data: { id: created.id, username: created.username } };
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
      },
    };
  }
}
