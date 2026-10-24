import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../devices/entities/device.entity';
import { hashDeviceToken } from '../common/token-hash.util';

@Injectable()
export class DeviceAgentGuard implements CanActivate {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      throw new UnauthorizedException('Missing x-api-key header');
    }

    // Token disimpan sebagai hash sejak mekanisme ini berlaku. Device lama
    // yang masih menyimpan token plaintext di database dikenali lewat
    // fallback di bawah dan langsung di-upgrade ke hash pada request
    // pertamanya, sehingga tidak perlu migration manual.
    let device = await this.deviceRepository.findOne({
      where: { token: hashDeviceToken(apiKey) },
    });
    if (!device) {
      const legacy = await this.deviceRepository.findOne({ where: { token: apiKey } });
      if (legacy) {
        legacy.token = hashDeviceToken(apiKey);
        device = await this.deviceRepository.save(legacy);
      }
    }
    if (!device) {
      throw new UnauthorizedException('Invalid device token');
    }
    request.device = device;
    return true;
  }
}
