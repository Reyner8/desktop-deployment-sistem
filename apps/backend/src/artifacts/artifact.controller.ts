import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ArtifactService } from './artifact.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import * as fs from 'fs';

@Controller()
@UseGuards(JwtAuthGuard)
export class ArtifactController {
  constructor(private readonly artifactService: ArtifactService) {}

  @Post('releases/:releaseId/artifact')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('releaseId') releaseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { success: false, message: 'File is required' };
    }
    const data = await this.artifactService.uploadFile(releaseId, file);
    return { success: true, data };
  }

  @Get('artifacts/:id/download-url')
  async getDownloadUrl(@Param('id') id: string) {
    const artifact = await this.artifactService.findArtifactByKey(id);
    if (!artifact) {
      return { success: false, message: 'Artifact not found' };
    }
    const url = await this.artifactService.getDownloadUrl(artifact);
    return { success: true, data: { url } };
  }

  @Get('artifacts/file/:key')
  async serveFile(@Param('key') key: string, @Res() res: Response) {
    const artifact = await this.artifactService.findArtifactByKey(key);
    if (!artifact) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const filePath = './uploads/artifacts/' + key;
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}