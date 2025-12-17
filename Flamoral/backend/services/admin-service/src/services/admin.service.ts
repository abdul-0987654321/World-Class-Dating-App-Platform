import { db } from '../infrastructure/database';
import { AdminRole, ROLE_PERMISSIONS } from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class AdminService {
  /**
   * List all admins
   */
  async listAdmins(filters: {
    role?: AdminRole;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = db('admins').select('*');

    if (filters.role) {
      query = query.where('role', filters.role);
    }

    if (filters.isActive !== undefined) {
      query = query.where('is_active', filters.isActive);
    }

    if (filters.search) {
      query = query.where(function() {
        this.where('email', 'ilike', `%${filters.search}%`)
          .orWhere('first_name', 'ilike', `%${filters.search}%`)
          .orWhere('last_name', 'ilike', `%${filters.search}%`);
      });
    }

    const [admins, [{ count }]] = await Promise.all([
      query.orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().count('* as count'),
    ]);

    return {
      admins: admins.map(admin => this.formatAdmin(admin)),
      total: parseInt(count as string),
      page,
      limit,
    };
  }

  /**
   * Get admin by ID
   */
  async getAdmin(adminId: string) {
    const admin = await db('admins').where({ id: adminId }).first();

    if (!admin) {
      throw new Error('Admin not found');
    }

    // Get activity logs
    const activityLogs = await db('audit_logs')
      .where({ admin_id: adminId })
      .orderBy('created_at', 'desc')
      .limit(50);

    return {
      ...this.formatAdmin(admin),
      activityLogs: activityLogs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resource_id,
        timestamp: log.created_at,
      })),
    };
  }

  /**
   * Create new admin
   */
  async createAdmin(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: AdminRole;
    password: string;
    createdBy: string;
  }) {
    // Check if email already exists
    const existing = await db('admins').where({ email: data.email }).first();

    if (existing) {
      throw new Error('Email already in use');
    }

    const adminId = uuidv4();
    const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

    await db('admins').insert({
      id: adminId,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
      password_hash: passwordHash,
      is_active: true,
      created_by: data.createdBy,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    logger.info(`Admin created: ${data.email}`, { role: data.role, createdBy: data.createdBy });

    return this.getAdmin(adminId);
  }

  /**
   * Update admin
   */
  async updateAdmin(adminId: string, updates: {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: AdminRole;
  }) {
    const admin = await db('admins').where({ id: adminId }).first();

    if (!admin) {
      throw new Error('Admin not found');
    }

    // Check if email is being changed and if it's already in use
    if (updates.email && updates.email !== admin.email) {
      const existing = await db('admins').where({ email: updates.email }).first();
      if (existing) {
        throw new Error('Email already in use');
      }
    }

    const updateData: any = { updated_at: db.fn.now() };

    if (updates.email) updateData.email = updates.email;
    if (updates.firstName) updateData.first_name = updates.firstName;
    if (updates.lastName) updateData.last_name = updates.lastName;
    if (updates.role) updateData.role = updates.role;

    await db('admins').where({ id: adminId }).update(updateData);

    logger.info(`Admin updated: ${adminId}`, updates);

    return this.getAdmin(adminId);
  }

  /**
   * Deactivate admin
   */
  async deactivateAdmin(adminId: string, reason?: string) {
    await db('admins')
      .where({ id: adminId })
      .update({
        is_active: false,
        deactivated_at: db.fn.now(),
        deactivation_reason: reason || null,
        updated_at: db.fn.now(),
      });

    logger.info(`Admin deactivated: ${adminId}`, { reason });
  }

  /**
   * Reactivate admin
   */
  async reactivateAdmin(adminId: string) {
    await db('admins')
      .where({ id: adminId })
      .update({
        is_active: true,
        deactivated_at: null,
        deactivation_reason: null,
        updated_at: db.fn.now(),
      });

    logger.info(`Admin reactivated: ${adminId}`);
  }

  /**
   * Delete admin (soft delete)
   */
  async deleteAdmin(adminId: string) {
    await db('admins')
      .where({ id: adminId })
      .update({
        is_active: false,
        deleted_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

    logger.info(`Admin deleted: ${adminId}`);
  }

  /**
   * Get admin statistics
   */
  async getAdminStats() {
    const [total, active, byRole, recentLogins] = await Promise.all([
      db('admins').count('* as count').first(),
      db('admins').where({ is_active: true }).count('* as count').first(),
      db('admins')
        .select('role')
        .count('* as count')
        .groupBy('role'),
      db('admins')
        .select('id', 'email', 'first_name', 'last_name', 'last_login')
        .whereNotNull('last_login')
        .orderBy('last_login', 'desc')
        .limit(10),
    ]);

    return {
      total: parseInt(total?.count as string) || 0,
      active: parseInt(active?.count as string) || 0,
      byRole: byRole.reduce((acc, item) => {
        acc[item.role] = parseInt(item.count as string);
        return acc;
      }, {} as Record<string, number>),
      recentLogins: recentLogins.map(admin => ({
        id: admin.id,
        email: admin.email,
        name: `${admin.first_name} ${admin.last_name}`,
        lastLogin: admin.last_login,
      })),
    };
  }

  /**
   * Get admin permissions
   */
  async getAdminPermissions(adminId: string) {
    const admin = await db('admins').where({ id: adminId }).first();

    if (!admin) {
      throw new Error('Admin not found');
    }

    return {
      adminId: admin.id,
      role: admin.role,
      permissions: ROLE_PERMISSIONS[admin.role as AdminRole] || [],
    };
  }

  /**
   * Format admin object
   */
  private formatAdmin(admin: any) {
    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.first_name,
      lastName: admin.last_name,
      role: admin.role,
      isActive: admin.is_active,
      lastLogin: admin.last_login,
      lastActivity: admin.last_activity,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at,
      createdBy: admin.created_by,
    };
  }
}
