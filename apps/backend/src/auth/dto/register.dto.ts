import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@rscb/shared';

export class RegisterDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  // Endpoint ini hanya bisa dipanggil ADMIN (RolesGuard), jadi role di sini
  // aman — default OPERATOR bila tidak diisi.
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
