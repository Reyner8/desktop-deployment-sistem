import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { Device } from './entities/device.entity';
import { DeviceNetwork } from './entities/device-network.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Device, DeviceNetwork])],
  controllers: [DeviceController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}