import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeploymentService } from './deployment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { QueryDeploymentDto } from './dto/query-deployment.dto';

@Controller('deployments')
@UseGuards(JwtAuthGuard)
export class DeploymentController {
  constructor(private readonly deploymentService: DeploymentService) {}

  @Post()
  async create(@Body() dto: CreateDeploymentDto) {
    const data = await this.deploymentService.create(dto);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: QueryDeploymentDto) {
    const data = await this.deploymentService.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.deploymentService.findOne(id);
    return { success: true, data };
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    const data = await this.deploymentService.cancel(id);
    return { success: true, data };
  }
}