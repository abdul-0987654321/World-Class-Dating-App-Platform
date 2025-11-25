import { ReportCategory } from '../entities/ReportCategory.entity';
import db from '../../infrastructure/database/connection';

export class ReportCategoryRepository {
  private tableName = 'report_categories';

  async findById(id: string): Promise<ReportCategory | null> {
    const category = await db(this.tableName)
      .where({ id })
      .first();

    return category ? this.mapToEntity(category) : null;
  }

  async findByCode(code: string): Promise<ReportCategory | null> {
    const category = await db(this.tableName)
      .where({ code })
      .first();

    return category ? this.mapToEntity(category) : null;
  }

  async findAll(): Promise<ReportCategory[]> {
    const categories = await db(this.tableName)
      .orderBy('display_order', 'asc')
      .orderBy('name', 'asc')
      .select('*');

    return categories.map(this.mapToEntity);
  }

  async findAllActive(): Promise<ReportCategory[]> {
    const categories = await db(this.tableName)
      .where({ active: true })
      .orderBy('display_order', 'asc')
      .orderBy('name', 'asc')
      .select('*');

    return categories.map(this.mapToEntity);
  }

  async findBySeverity(severity: string): Promise<ReportCategory[]> {
    const categories = await db(this.tableName)
      .where({ severity, active: true })
      .orderBy('display_order', 'asc')
      .select('*');

    return categories.map(this.mapToEntity);
  }

  async findByAutoAction(autoAction: string): Promise<ReportCategory[]> {
    const categories = await db(this.tableName)
      .where({ auto_action: autoAction, active: true })
      .orderBy('severity', 'desc')
      .select('*');

    return categories.map(this.mapToEntity);
  }

  async updateAutoAction(
    id: string,
    autoAction: ReportCategory['autoAction'],
    suspensionDurationHours?: number
  ): Promise<ReportCategory> {
    const updateData: any = {
      auto_action: autoAction,
      updated_at: new Date(),
    };

    if (suspensionDurationHours !== undefined) {
      updateData.suspension_duration_hours = suspensionDurationHours;
    }

    const [category] = await db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return this.mapToEntity(category);
  }

  async updateSeverity(id: string, severity: ReportCategory['severity']): Promise<ReportCategory> {
    const [category] = await db(this.tableName)
      .where({ id })
      .update({
        severity,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(category);
  }

  async toggleActive(id: string, active: boolean): Promise<ReportCategory> {
    const [category] = await db(this.tableName)
      .where({ id })
      .update({
        active,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(category);
  }

  async updateDisplayOrder(id: string, displayOrder: number): Promise<ReportCategory> {
    const [category] = await db(this.tableName)
      .where({ id })
      .update({
        display_order: displayOrder,
        updated_at: new Date(),
      })
      .returning('*');

    return this.mapToEntity(category);
  }

  // Get categories requiring immediate action
  async findCriticalCategories(): Promise<ReportCategory[]> {
    const categories = await db(this.tableName)
      .where({ severity: 'critical', active: true })
      .whereIn('auto_action', ['suspend', 'ban'])
      .orderBy('display_order', 'asc')
      .select('*');

    return categories.map(this.mapToEntity);
  }

  // Get all categories grouped by severity
  async findAllGroupedBySeverity(): Promise<Record<string, ReportCategory[]>> {
    const categories = await this.findAllActive();

    return categories.reduce((acc, category) => {
      if (!acc[category.severity]) {
        acc[category.severity] = [];
      }
      acc[category.severity].push(category);
      return acc;
    }, {} as Record<string, ReportCategory[]>);
  }

  // Map database row to entity
  private mapToEntity(row: any): ReportCategory {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      severity: row.severity,
      autoAction: row.auto_action,
      suspensionDurationHours: row.suspension_duration_hours,
      active: row.active,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ReportCategoryRepository();
