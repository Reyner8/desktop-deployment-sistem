import { IsString, IsArray, IsOptional } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  hostname: string;

  @IsArray()
  @IsOptional()
  ipAddress?: string[];

  @IsString()
  @IsOptional()
  applicationVersion?: string;

  @IsString()
  agentVersion: string;
}