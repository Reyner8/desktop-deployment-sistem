import { IsString, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateDeploymentDto {
  @IsString()
  releaseId: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  deviceIds: string[];
}