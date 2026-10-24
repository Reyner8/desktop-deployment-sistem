import { IsEnum } from 'class-validator';
import { UserRole } from '@rscb/shared';

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
