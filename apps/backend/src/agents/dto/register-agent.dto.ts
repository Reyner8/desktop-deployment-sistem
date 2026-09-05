import { IsString, IsArray, IsOptional, IsIn } from 'class-validator';

export class RegisterAgentDto {
  @IsString()
  deviceId: string;

  @IsString()
  hostname: string;

  @IsArray()
  @IsOptional()
  ipAddress?: string[];

  @IsString()
  @IsOptional()
  os?: string;

  @IsString()
  agentVersion: string;

  @IsString()
  @IsOptional()
  applicationVersion?: string;
}