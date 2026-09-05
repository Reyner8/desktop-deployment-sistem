import { AuditAction } from '../enums/audit-action.enum';

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: AuditAction;
  target: string;
  targetId: string;
  details?: Record<string, unknown>;
  result: 'SUCCESS' | 'FAILURE';
  timestamp: string;
}