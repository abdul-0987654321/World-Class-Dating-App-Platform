/**
 * Relationship Progression Hooks
 * React hooks for milestones, stages, timeline, and shared experiences
 */

import { useState, useEffect, useCallback } from 'react';
import {
  relationshipProgressionService,
  RelationshipProgression,
  RelationshipStage,
  StageInfo,
  Milestone,
  MilestoneTemplate,
  CelebrationPrompt,
  SharedExperience,
  RelationshipTimeline,
  CompatibilityInsight,
  ExperienceType,
  ExperienceLocation,
} from '../services/relationship-progression.service';

// ============================================================================
// Progression Hook
// ============================================================================

interface UseProgressionReturn {
  progression: RelationshipProgression | null;
  stages: StageInfo[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStage: (newStage: RelationshipStage, reason?: string) => Promise<void>;
}

export function useProgression(conversationId?: string): UseProgressionReturn {
  const [progression, setProgression] = useState<RelationshipProgression | null>(null);
  const [stages, setStages] = useState<StageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [stagesData, progressionData] = await Promise.all([
        relationshipProgressionService.getStages(),
        conversationId
          ? relationshipProgressionService.getProgressionByConversation(conversationId)
          : Promise.resolve(null),
      ]);

      setStages(stagesData);
      setProgression(progressionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progression data');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateStage = useCallback(
    async (newStage: RelationshipStage, reason?: string) => {
      if (!progression) return;

      const updated = await relationshipProgressionService.updateStage(
        progression.id,
        newStage,
        reason
      );
      setProgression(updated);
    },
    [progression]
  );

  return {
    progression,
    stages,
    isLoading,
    error,
    refresh,
    updateStage,
  };
}

// ============================================================================
// Milestones Hook
// ============================================================================

interface UseMilestonesReturn {
  milestones: Milestone[];
  templates: MilestoneTemplate[];
  celebrationPrompts: CelebrationPrompt[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createMilestone: (
    type: Milestone['type'],
    title?: string,
    description?: string
  ) => Promise<Milestone>;
  celebrate: (milestoneId: string) => Promise<void>;
  addMemory: (
    milestoneId: string,
    type: 'text' | 'photo' | 'voice' | 'location',
    content: string
  ) => Promise<void>;
}

export function useMilestones(progressionId?: string): UseMilestonesReturn {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [templates, setTemplates] = useState<MilestoneTemplate[]>([]);
  const [celebrationPrompts, setCelebrationPrompts] = useState<CelebrationPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const templatesData = await relationshipProgressionService.getMilestoneTemplates();
      setTemplates(templatesData);

      if (progressionId) {
        const [milestonesData, promptsData] = await Promise.all([
          relationshipProgressionService.getMilestones(progressionId),
          relationshipProgressionService.getCelebrationPrompts(progressionId),
        ]);

        setMilestones(milestonesData);
        setCelebrationPrompts(promptsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load milestones');
    } finally {
      setIsLoading(false);
    }
  }, [progressionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createMilestone = useCallback(
    async (type: Milestone['type'], title?: string, description?: string) => {
      if (!progressionId) throw new Error('No progression ID');

      const milestone = await relationshipProgressionService.createMilestone(
        progressionId,
        type,
        title,
        description
      );
      setMilestones((prev) => [...prev, milestone]);
      return milestone;
    },
    [progressionId]
  );

  const celebrate = useCallback(async (milestoneId: string) => {
    const updated = await relationshipProgressionService.celebrateMilestone(milestoneId);
    setMilestones((prev) => prev.map((m) => (m.id === milestoneId ? updated : m)));
    setCelebrationPrompts((prev) => prev.filter((p) => p.milestoneId !== milestoneId));
  }, []);

  const addMemory = useCallback(
    async (milestoneId: string, type: 'text' | 'photo' | 'voice' | 'location', content: string) => {
      const memory = await relationshipProgressionService.addMilestoneMemory(
        milestoneId,
        type,
        content
      );
      setMilestones((prev) =>
        prev.map((m) => (m.id === milestoneId ? { ...m, memories: [...m.memories, memory] } : m))
      );
    },
    []
  );

  return {
    milestones,
    templates,
    celebrationPrompts,
    isLoading,
    error,
    refresh,
    createMilestone,
    celebrate,
    addMemory,
  };
}

// ============================================================================
// Timeline Hook
// ============================================================================

interface UseTimelineReturn {
  timeline: RelationshipTimeline | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTimeline(progressionId?: string): UseTimelineReturn {
  const [timeline, setTimeline] = useState<RelationshipTimeline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!progressionId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await relationshipProgressionService.getTimeline(progressionId);
      setTimeline(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setIsLoading(false);
    }
  }, [progressionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    timeline,
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// Compatibility Hook
// ============================================================================

interface UseCompatibilityReturn {
  compatibility: CompatibilityInsight | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCompatibility(progressionId?: string): UseCompatibilityReturn {
  const [compatibility, setCompatibility] = useState<CompatibilityInsight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!progressionId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await relationshipProgressionService.getCompatibility(progressionId);
      setCompatibility(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compatibility');
    } finally {
      setIsLoading(false);
    }
  }, [progressionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    compatibility,
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// Experiences Hook
// ============================================================================

interface UseExperiencesReturn {
  experiences: SharedExperience[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createExperience: (experience: {
    type: ExperienceType;
    title: string;
    description?: string;
    date: string;
    location?: ExperienceLocation;
    tags?: string[];
    isPrivate?: boolean;
  }) => Promise<SharedExperience>;
  recordMood: (
    experienceId: string,
    mood: 'amazing' | 'great' | 'good' | 'okay' | 'not_great'
  ) => Promise<void>;
}

export function useExperiences(progressionId?: string): UseExperiencesReturn {
  const [experiences, setExperiences] = useState<SharedExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!progressionId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const data = await relationshipProgressionService.getExperiences(progressionId);
      setExperiences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiences');
    } finally {
      setIsLoading(false);
    }
  }, [progressionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createExperience = useCallback(
    async (experience: {
      type: ExperienceType;
      title: string;
      description?: string;
      date: string;
      location?: ExperienceLocation;
      tags?: string[];
      isPrivate?: boolean;
    }) => {
      if (!progressionId) throw new Error('No progression ID');

      const created = await relationshipProgressionService.createExperience(
        progressionId,
        experience
      );
      setExperiences((prev) => [created, ...prev]);
      return created;
    },
    [progressionId]
  );

  const recordMood = useCallback(
    async (experienceId: string, mood: 'amazing' | 'great' | 'good' | 'okay' | 'not_great') => {
      const updated = await relationshipProgressionService.recordExperienceMood(experienceId, mood);
      setExperiences((prev) => prev.map((e) => (e.id === experienceId ? updated : e)));
    },
    []
  );

  return {
    experiences,
    isLoading,
    error,
    refresh,
    createExperience,
    recordMood,
  };
}

export default useProgression;
