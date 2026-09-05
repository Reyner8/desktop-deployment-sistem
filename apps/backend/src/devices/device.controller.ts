import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QueryDeviceDto } from './dto/query-device.dto';

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  async findAll(@Query() query: QueryDeviceDto) {
    const data = await this.deviceService.findAll(query);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.deviceService.findOne(id);
    return { success: true, data };
  }
}