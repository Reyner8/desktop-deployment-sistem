import { IsString, IsOptional } from 'class-validator';

export class DeploymentStatusDto {
  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;
}