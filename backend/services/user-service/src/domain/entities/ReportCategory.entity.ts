export interface ReportCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoAction: 'none' | 'flag' | 'warn' | 'suspend' | 'ban';
  suspensionDurationHours?: number;
  active: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportCategoryCreateInput {
  code: string;
  name: string;
  description?: string;
  severity: ReportCategory['severity'];
  autoAction: ReportCategory['autoAction'];
  suspensionDurationHours?: number;
  displayOrder?: number;
}

export interface ReportCategoryUpdateInput {
  name?: string;
  description?: string;
  severity?: ReportCategory['severity'];
  autoAction?: ReportCategory['autoAction'];
  suspensionDurationHours?: number;
  active?: boolean;
  displayOrder?: number;
}

export const AUTO_ACTIONS = {
  NONE: 'none',
  FLAG: 'flag',
  WARN: 'warn',
  SUSPEND: 'suspend',
  BAN: 'ban',
} as const;

// Get recommended action based on category
export function getRecommendedAction(category: ReportCategory): string {
  if (!category.active) {
    return AUTO_ACTIONS.NONE;
  }

  return category.autoAction;
}

// Check if action requires immediate intervention
export function requiresImmediateAction(category: ReportCategory): boolean {
  return (
    category.severity === 'critical' &&
    (category.autoAction === 'suspend' || category.autoAction === 'ban')
  );
}

// Get suspension duration
export function getSuspensionDuration(category: ReportCategory): number {
  if (category.autoAction !== 'suspend') {
    return 0;
  }

  return category.suspensionDurationHours || 24; // Default to 24 hours
}

// Format suspension duration for display
export function formatSuspensionDuration(hours: number): string {
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }

  return `${days}d ${remainingHours}h`;
}

// Sort categories by severity and display order
export function sortCategories(categories: ReportCategory[]): ReportCategory[] {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return [...categories].sort((a, b) => {
    // First by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    // Then by display order
    return a.displayOrder - b.displayOrder;
  });
}

// Get categories by severity level
export function getCategoriesBySeverity(
  categories: ReportCategory[],
  severity: ReportCategory['severity']
): ReportCategory[] {
  return categories.filter((cat) => cat.severity === severity && cat.active);
}
