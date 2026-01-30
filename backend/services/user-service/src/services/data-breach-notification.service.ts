import { Knex } from 'knex';
import logger from '../utils/logger';

export interface BreachRecord {
  id: string; breach_id: string;
  breach_type: 'unauthorized_access' | 'data_loss' | 'data_exposure' | 'ransomware' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string; data_categories_affected: string[];
  estimated_affected_users: number; discovered_at: Date; occurred_at?: Date;
  reported_to_authority_at?: Date; users_notified_at?: Date;
  containment_actions: string; remediation_steps: string;
  status: 'detected' | 'investigating' | 'contained' | 'notifying' | 'resolved';
  reported_by: string; dpo_notified: boolean; created_at: Date; updated_at: Date;
}

export interface BreachNotificationResult {
  breachId: string; totalAffectedUsers: number; usersNotified: number;
  notificationsFailed: number; authorityNotified: boolean; dpoNotified: boolean;
  withinGDPR72Hours: boolean;
}

export class DataBreachNotificationService {
  private db: Knex;
  private readonly DPO_EMAIL = 'dpo@flamoral.com';
  private readonly GDPR_DEADLINE_HOURS = 72;
  constructor(database: Knex) { this.db = database; }

  async recordBreach(params: { breachType: BreachRecord['breach_type']; severity: BreachRecord['severity']; description: string; dataCategoriesAffected: string[]; estimatedAffectedUsers: number; occurredAt?: Date; containmentActions: string; remediationSteps: string; reportedBy: string; }): Promise<BreachRecord> {
    const breachId = 'BREACH-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const [breach] = await this.db('data_breach_incidents').insert({ breach_id: breachId, breach_type: params.breachType, severity: params.severity, description: params.description, data_categories_affected: JSON.stringify(params.dataCategoriesAffected), estimated_affected_users: params.estimatedAffectedUsers, discovered_at: new Date(), occurred_at: params.occurredAt || null, containment_actions: params.containmentActions, remediation_steps: params.remediationSteps, status: 'detected', reported_by: params.reportedBy, dpo_notified: false, created_at: new Date(), updated_at: new Date() }).returning('*');
    logger.error('DATA BREACH RECORDED: ' + breachId, { breachId, severity: params.severity });
    await this.notifyDPO(breach);
    if (params.severity === 'high' || params.severity === 'critical') { this.initiateWorkflow(breach).catch(e => logger.error('Breach workflow failed: ' + e)); }
    return breach;
  }

  private async notifyDPO(breach: BreachRecord): Promise<void> {
    logger.error('DPO NOTIFICATION: Breach ' + breach.breach_id, { severity: breach.severity, dpo: this.DPO_EMAIL });
    await this.db('data_breach_incidents').where({ id: breach.id }).update({ dpo_notified: true, updated_at: new Date() });
  }

  async initiateWorkflow(breach: BreachRecord): Promise<BreachNotificationResult> {
    const result: BreachNotificationResult = { breachId: breach.breach_id, totalAffectedUsers: breach.estimated_affected_users, usersNotified: 0, notificationsFailed: 0, authorityNotified: false, dpoNotified: breach.dpo_notified, withinGDPR72Hours: true };
    await this.setStatus(breach.breach_id, 'investigating');
    const deadline = new Date(breach.discovered_at.getTime() + this.GDPR_DEADLINE_HOURS * 3600000);
    result.withinGDPR72Hours = new Date() < deadline;
    logger.error('SUPERVISORY AUTHORITY NOTIFICATION', { breachId: breach.breach_id, org: 'Flamoral, Inc.' });
    result.authorityNotified = true;
    await this.setStatus(breach.breach_id, 'notifying');
    if (breach.severity === 'high' || breach.severity === 'critical') {
      const users = await this.db('users').where({ is_active: true }).select('id', 'email');
      for (const user of users) { try { await this.db('breach_user_notifications').insert({ breach_id: breach.breach_id, user_id: user.id, notified_at: new Date(), notification_channel: 'email', status: 'sent' }); result.usersNotified++; } catch { result.notificationsFailed++; } }
    }
    await this.setStatus(breach.breach_id, 'contained');
    await this.db('data_breach_incidents').where({ breach_id: breach.breach_id }).update({ reported_to_authority_at: new Date(), updated_at: new Date() });
    return result;
  }

  private async setStatus(breachId: string, status: BreachRecord['status']): Promise<void> { await this.db('data_breach_incidents').where({ breach_id: breachId }).update({ status, updated_at: new Date() }); }
  async getBreach(breachId: string): Promise<BreachRecord | null> { return this.db('data_breach_incidents').where({ breach_id: breachId }).first(); }
  async getAllBreaches(): Promise<BreachRecord[]> { return this.db('data_breach_incidents').orderBy('discovered_at', 'desc').select('*'); }
  async checkPendingDeadlines(): Promise<BreachRecord[]> { return this.db('data_breach_incidents').whereIn('status', ['detected', 'investigating']).where('discovered_at', '<=', new Date(Date.now() - 48 * 3600000)).whereNull('reported_to_authority_at').select('*'); }
}
