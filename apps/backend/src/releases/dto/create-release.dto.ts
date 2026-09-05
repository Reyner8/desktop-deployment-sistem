import { IsString, IsOptional } from 'class-validator';

export class CreateReleaseDto {
  @IsString()
  application: string;

  @IsString()
  version: string;

  @IsString()
  @IsOptional()
  releaseNotes?: string;
}