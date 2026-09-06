import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateUploadDto {
  @IsString()
  application: string;

  @IsString()
  version: string;

  @IsOptional()
  @IsString()
  releaseNotes?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsInt()
  @Min(1)
  totalSize: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sha256?: string;
}