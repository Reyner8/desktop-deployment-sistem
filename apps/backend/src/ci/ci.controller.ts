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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CiService } from './ci.service';
import { CiAuthGuard } from '../common/guards/ci-auth.guard';
import { CreateUploadDto } from './dto/create-upload.dto';
import { CI_PART_SIZE } from './ci.constants';

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
  ) {
    const data = await this.ciService.findRelease(application, version);
    return { success: true, data };
  }
}