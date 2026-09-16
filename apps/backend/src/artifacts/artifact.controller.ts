import {
  Controller,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ArtifactService } from './artifact.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ArtifactController {
  constructor(private readonly artifactService: ArtifactService) {}

  @Post('releases/:releaseId/artifact')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('releaseId') releaseId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      return { success: false, message: 'File is required' };
    }
    const data = await this.artifactService.uploadFile(releaseId, file, user?.username);
    return { success: true, data };
  }
}
