import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Device } from './entities/device.entity';
import { DeviceNetwork } from './entities/device-network.entity';
import { QueryDeviceDto } from './dto/query-device.dto';
import { DeviceStatus } from '@rscb/shared';

@Injectable()
export class DeviceService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(DeviceNetwork)
    private readonly networkRepository: Repository<DeviceNetwork>,
  ) {}

  async findAll(query: QueryDeviceDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.hostname = Like(`%${query.search}%`);
    }

    const [data, total] = await this.deviceRepository.findAndCount({
      where,
      relations: ['networks'],
      skip,
      take: limit,
      order: { lastSeen: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ['networks'],
    });
    return device;
  }

  async updateStatus(deviceId: string, status: DeviceStatus) {
    await this.deviceRepository.update({ deviceId }, { status, lastSeen: new Date() });
  }
}