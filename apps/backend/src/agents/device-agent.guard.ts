import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../devices/entities/device.entity';

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
    const device = await this.deviceRepository.findOne({ where: { token: apiKey } });
    if (!device) {
      throw new UnauthorizedException('Invalid device token');
    }
    request.device = device;
    return true;
  }
}