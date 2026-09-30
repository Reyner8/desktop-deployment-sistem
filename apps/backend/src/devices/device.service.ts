import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, LessThan, MoreThanOrEqual } from 'typeorm';
import { Device } from './entities/device.entity';
import { DeviceNetwork } from './entities/device-network.entity';
import { QueryDeviceDto } from './dto/query-device.dto';
import { DeviceStatus, DEVICE_OFFLINE_AFTER_MS } from '@rscb/shared';
import { resolveOrder } from '../common/sort.util';

/**
 * Kolom device yang bisa diurutkan.
 *
 * 'status' tidak ada di sini karena nilai yang ditampilkan berasal dari
 * lastSeen, bukan kolomnya (lihat withOfflineStatus), sehingga urutannya akan
 * menyesatkan. 'ipAddress' berasal dari relasi networks, bukan kolom device.
 */
const SORTABLE_FIELDS = ['hostname', 'applicationVersion', 'agentVersion', 'lastSeen'] as const;

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
    const offlineBefore = new Date(Date.now() - DEVICE_OFFLINE_AFTER_MS);

    const where: any = {};
    if (query.status === DeviceStatus.OFFLINE) {
      where.lastSeen = LessThan(offlineBefore);
    } else if (query.status) {
      where.status = query.status;
      where.lastSeen = MoreThanOrEqual(offlineBefore);
    }
    if (query.search) {
      where.hostname = Like(`%${query.search}%`);
    }

    const [data, total] = await this.deviceRepository.findAndCount({
      where,
      relations: ['networks'],
      skip,
      take: limit,
      select: {
        id: true,
        deviceId: true,
        hostname: true,
        os: true,
        agentVersion: true,
        applicationVersion: true,
        status: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
      order: resolveOrder(query.sort, SORTABLE_FIELDS, 'lastSeen', query.order),
    });

    return {
      data: data.map((device) => this.withOfflineStatus(device)),
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
      select: {
        id: true,
        deviceId: true,
        hostname: true,
        os: true,
        agentVersion: true,
        applicationVersion: true,
        status: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return this.withOfflineStatus(device);
  }

  /**
   * Status OFFLINE diturunkan dari lastSeen, bukan dari kolom yang disimpan,
   * karena tidak ada proses yang menulis status tersebut.
   */
  private withOfflineStatus(device: Device): Device {
    if (device.lastSeen.getTime() < Date.now() - DEVICE_OFFLINE_AFTER_MS) {
      device.status = DeviceStatus.OFFLINE;
    }
    return device;
  }
}