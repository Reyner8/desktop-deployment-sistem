import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    // Liveness kini benar-benar mengecek DB: tanpa DB backend tidak
    // berguna, jadi 503 lebih jujur daripada ok statis. Timestamp tetap
    // disertakan karena dipakai UI Settings.
    const result = await this.health.check([() => this.db.pingCheck('database')]);
    return { ...result, timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}