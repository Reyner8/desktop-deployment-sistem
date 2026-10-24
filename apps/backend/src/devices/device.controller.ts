import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QueryDeviceDto } from './dto/query-device.dto';
import { UserRole } from '@rscb/shared';

export class SetDeviceActiveDto {
  @IsBoolean()
  isActive: boolean;
}

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

  // Nonaktif/aktif device adalah keputusan administratif — ADMIN saja.
  @Patch(':id/active')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async setActive(
    @Param('id') id: string,
    @Body() dto: SetDeviceActiveDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.deviceService.setActive(id, dto.isActive, user?.username);
    return { success: true, data };
  }
}