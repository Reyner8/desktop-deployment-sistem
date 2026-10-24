import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CiService } from './ci.service';
import { CiAuthGuard } from '../common/guards/ci-auth.guard';
import { CreateUploadDto } from './dto/create-upload.dto';
import { CI_PART_SIZE } from './ci.constants';
import { ReleaseStatus } from '@rscb/shared';

@Controller('ci')
@UseGuards(CiAuthGuard)
export class CiController {
  constructor(private readonly ciService: CiService) {}

  @Post('uploads')
  async start(@Body() dto: CreateUploadDto) {
    const data = await this.ciService.start(dto);
    return { success: true, data };
  }

  @Post('uploads/:uploadId/parts/:partNumber')
  @UseInterceptors(
    FileInterceptor('file', { limits: { files: 1, fileSize: CI_PART_SIZE } }),
  )
  async uploadPart(
    @Param('uploadId') uploadId: string,
    @Param('partNumber', ParseIntPipe) partNumber: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.ciService.uploadPart(uploadId, partNumber, file);
    return { success: true, data };
  }

  @Get('uploads/:uploadId')
  async status(@Param('uploadId') uploadId: string) {
    const data = await this.ciService.getStatus(uploadId);
    return { success: true, data };
  }

  @Post('uploads/:uploadId/complete')
  async complete(@Param('uploadId') uploadId: string) {
    const data = await this.ciService.complete(uploadId);
    return { success: true, data };
  }

  @Delete('uploads/:uploadId')
  async abort(@Param('uploadId') uploadId: string) {
    const data = await this.ciService.abort(uploadId);
    return { success: true, data };
  }

  @Get('releases')
  async findByVersion(
    @Query('application') application: string,
    @Query('version') version: string,
    @Query('status') status?: string,
  ) {
    // Status masuk where-clause enum TypeORM apa adanya — nilai asal akan
    // melempar error DB dan menjadi 500. Validasi di sini supaya CI mendapat
    // 400 yang jelas.
    if (status && !Object.values(ReleaseStatus).includes(status as ReleaseStatus)) {
      throw new BadRequestException(
        `Invalid status "${status}". Allowed: ${Object.values(ReleaseStatus).join(', ')}`,
      );
    }
    const data = await this.ciService.findRelease(application, version, status);
    return { success: true, data };
  }
}
