import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AgentService } from './agent.service';
import { DeviceAgentGuard } from './device-agent.guard';
import { RegisterAgentDto } from './dto/register-agent.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { DeploymentStatusDto } from './dto/deployment-status.dto';

@Controller('agents')
@UseGuards(DeviceAgentGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('register')
  @UseGuards(DeviceAgentGuard)
  async register(@Body() dto: RegisterAgentDto) {
    const result = await this.agentService.register(dto);
    return { success: true, data: result };
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Req() request: Request, @Body() dto: HeartbeatDto) {
    const device = (request as any).device as { deviceId: string };
    const result = await this.agentService.heartbeat(device.deviceId, dto);
    return { success: true, data: result };
  }

  @Get('updates')
  async getUpdates(@Req() request: Request) {
    const device = (request as any).device as { deviceId: string };
    const result = await this.agentService.getUpdates(device.deviceId);
    return { success: true, data: result };
  }

  @Post('deployments/:id/status')
  async reportStatus(@Param('id') id: string, @Body() dto: DeploymentStatusDto) {
    const result = await this.agentService.reportDeploymentStatus(id, dto);
    return { success: true, data: result };
  }

  @Get('artifacts/:releaseId/download-url')
  async getDownloadUrl(@Param('releaseId') releaseId: string) {
    const result = await this.agentService.getDownloadUrl(releaseId);
    return { success: true, data: result };
  }
}