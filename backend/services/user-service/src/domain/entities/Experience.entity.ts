export interface UserExperience {
  id: string;
  userId: string;
  totalXp: number;
  currentLevel: number;
  currentLevelXp: number;
  xpToNextLevel: number;
  levelProgressPercentage: number;
  lastXpEarnedAt: Date | null;
  lastLevelUpAt: Date | null;
  levelHistory: any[];
  createdAt: Date;
  updatedAt: Date;
}

export interface XPTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'bonus' | 'deducted' | 'penalty';
  source: string;
  description: string;
  metadata: any;
  levelBefore: number;
  levelAfter: number;
  totalXpAfter: number;
  createdAt: Date;
}

export interface LevelDefinition {
  id: string;
  level: number;
  title: string;
  description: string;
  xpRequired: number;
  xpForThisLevel: number;
  coinReward: number;
  boostReward: number;
  superLikeReward: number;
  unlocks: any;
  badgeIcon: string;
  badgeColor: string;
  tier: string;
  isMilestone: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface XPSource {
  id: string;
  actionKey: string;
  actionName: string;
  description: string;
  category: 'profile' | 'social' | 'activity' | 'engagement' | 'premium';
  baseXp: number;
  maxDailyCount: number | null;
  cooldownMinutes: number | null;
  isRepeatable: boolean;
  multiplier: number;
  bonusConditions: any;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LevelUpResult {
  leveledUp: boolean;
  levelsGained: LevelDefinition[];
  newLevel: number;
  newTotalXp: number;
}

export interface XPAwardResult {
  awarded: boolean;
  reason?: string;
  xpAwarded: number;
  leveledUp: boolean;
  levelsGained?: LevelDefinition[];
  newLevel?: number;
  newTotalXp?: number;
}
