import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
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
