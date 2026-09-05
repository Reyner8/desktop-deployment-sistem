import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.username, dto.password);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }
    const result = await this.authService.login(user);
    return { success: true, data: result };
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto.username, dto.password, dto.displayName);
    return { success: true, data: { id: user.id, username: user.username } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return { success: true, data: user };
  }
}