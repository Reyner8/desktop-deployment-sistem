import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReleaseService } from './release.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReleaseDto } from './dto/create-release.dto';
import { QueryReleaseDto } from './dto/query-release.dto';

@Controller('releases')
@UseGuards(JwtAuthGuard)
export class ReleaseController {
  constructor(private readonly releaseService: ReleaseService) {}

  @Post()
  async create(@Body() dto: CreateReleaseDto) {
    const data = await this.releaseService.create(dto);
    return { success: true, data };
  }

  @Get()
  async findAll(@Query() query: QueryReleaseDto) {
    const data = await this.releaseService.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.releaseService.findOne(id);
    return { success: true, data };
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string) {
    const data = await this.releaseService.publish(id);
    return { success: true, data };
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string) {
    const data = await this.releaseService.archive(id);
    return { success: true, data };
  }
}