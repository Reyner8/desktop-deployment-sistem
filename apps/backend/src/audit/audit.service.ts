import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { resolveOrder } from '../common/sort.util';

/**
 * Kolom audit yang bisa diurutkan sesuai kolom tabel. 'details' dikecualikan
 * karena berbentuk JSON.
 */
const SORTABLE_FIELDS = ['actor', 'action', 'target', 'result', 'timestamp'] as const;

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async log(params: {
    actor: string;
    action: string;
    target: string;
    targetId?: string;
    details?: Record<string, any>;
    result: string;
  }) {
    const log = this.auditRepository.create({
      actor: params.actor,
      action: params.action,
      target: params.target,
      targetId: params.targetId,
      details: params.details || undefined,
      result: params.result,
    });
    return this.auditRepository.save(log);
  }

  async findAll(query: {
    actor?: string;
    action?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.actor) {
      where.actor = Like(`%${query.actor}%`);
    }
    if (query.action) {
      where.action = query.action;
    }

    const [data, total] = await this.auditRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: resolveOrder(query.sortBy, SORTABLE_FIELDS, 'timestamp', query.sortOrder),
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}