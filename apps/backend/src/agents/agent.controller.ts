import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AgentService } from './agent.service';
import { DeviceAgentGuard } from './device-agent.guard';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { DeploymentStatusDto } from './dto/deployment-status.dto';

@Controller('agents')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('register')
  async register(@Body() dto: RegisterAgentDto) {
    const result = await this.agentService.register(dto);
    return { success: true, data: result };
  }

  @Post('heartbeat')
  @UseGuards(DeviceAgentGuard)
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Req() request: Request, @Body() dto: HeartbeatDto) {
    const device = (request as any).device as { deviceId: string };
    const result = await this.agentService.heartbeat(device.deviceId, dto);
    return { success: true, data: result };
  }

  @Get('updates')
  @UseGuards(DeviceAgentGuard)
  async getUpdates(@Req() request: Request) {
    const device = (request as any).device as { deviceId: string };
    const result = await this.agentService.getUpdates(device.deviceId);
    return { success: true, data: result };
  }

  @Post('deployments/:id/status')
  @UseGuards(DeviceAgentGuard)
  async reportStatus(
    @Param('id') id: string,
    @Req() request: Request,
    @Body() dto: DeploymentStatusDto,
  ) {
    const device = (request as any).device as { deviceId: string };
    const result = await this.agentService.reportDeploymentStatus(id, device.deviceId, dto);
    return { success: true, data: result };
  }

  @Get('artifacts/:releaseId/download-url')
  @UseGuards(DeviceAgentGuard)
  async getDownloadUrl(@Param('releaseId') releaseId: string) {
    const result = await this.agentService.getDownloadUrl(releaseId);
    return { success: true, data: result };
  }

  @Get('artifacts/:releaseId/file')
  @UseGuards(DeviceAgentGuard)
  async downloadFile(@Param('releaseId') releaseId: string, @Res() res: Response) {
    const file = await this.agentService.getArtifactFile(releaseId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.setHeader('Content-Length', String(file.size));
    const stream = file.stream as NodeJS.ReadableStream;
    // pipe() tidak meneruskan event "error" stream sumber; tanpa listener ini
    // Node melempar dan mematikan proses backend.
    stream.on('error', () => {
      if (res.headersSent) {
        res.destroy();
      } else {
        res.removeHeader('Content-Disposition');
        res.removeHeader('Content-Length');
        res.status(404).json({ success: false, message: 'Artifact not found' });
      }
    });
    stream.pipe(res);
  }
}
