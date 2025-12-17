import { createLogger } from '../utils/logger';
import { Icebreaker, IcebreakerSuggestion } from '../types/enhanced-types';

const logger = createLogger('icebreaker-service');

export class IcebreakerService {
  private icebreakers: Icebreaker[] = [];

  constructor() {
    this.initializeIcebreakers();
  }

  private initializeIcebreakers(): void {
    this.icebreakers = [
      {
        id: '1',
        category: 'Fun',
        text: 'If you could have dinner with anyone, dead or alive, who would it be?',
        popularity: 95,
        tags: ['conversation-starter', 'fun', 'casual'],
      },
      {
        id: '2',
        category: 'Fun',
        text: 'What is your go-to karaoke song?',
        popularity: 88,
        tags: ['music', 'fun', 'casual'],
      },
      {
        id: '3',
        category: 'Fun',
        text: 'Coffee or tea?',
        popularity: 92,
        tags: ['preferences', 'casual'],
      },
      {
        id: '4',
        category: 'Fun',
        text: 'What is the best trip you have ever taken?',
        popularity: 90,
        tags: ['travel', 'experiences'],
      },
      {
        id: '5',
        category: 'Fun',
        text: 'If you could live anywhere in the world, where would it be?',
        popularity: 87,
        tags: ['travel', 'dreams'],
      },
    ];
  }

  async getSuggestions(
    userId: string,
    otherUserId: string,
    count: number = 5
  ): Promise<IcebreakerSuggestion> {
    try {
      const topIcebreakers = [...this.icebreakers]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, count * 2);

      const selected: Icebreaker[] = [];
      const used = new Set<number>();

      while (selected.length < count && selected.length < topIcebreakers.length) {
        const index = Math.floor(Math.random() * topIcebreakers.length);
        if (!used.has(index)) {
          selected.push(topIcebreakers[index]);
          used.add(index);
        }
      }

      logger.info('Icebreaker suggestions generated', {
        userId,
        otherUserId,
        count: selected.length,
      });

      return {
        icebreakers: selected,
        personalized: false,
        basedOn: [],
      };
    } catch (error: any) {
      logger.error('Failed to get icebreaker suggestions:', error);
      throw error;
    }
  }

  async getByCategory(category: string, count: number = 10): Promise<Icebreaker[]> {
    const filtered = this.icebreakers
      .filter(ib => ib.category === category)
      .slice(0, count);
    return filtered;
  }

  async getRandom(): Promise<Icebreaker> {
    const index = Math.floor(Math.random() * this.icebreakers.length);
    return this.icebreakers[index];
  }

  async searchByTags(tags: string[], count: number = 10): Promise<Icebreaker[]> {
    const results = this.icebreakers.filter(ib =>
      tags.some(tag => ib.tags.includes(tag))
    );
    return results.slice(0, count);
  }

  getCategories(): string[] {
    const categories = new Set(this.icebreakers.map(ib => ib.category));
    return Array.from(categories);
  }

  async getPersonalizedByInterests(
    userInterests: string[],
    count: number = 5
  ): Promise<IcebreakerSuggestion> {
    try {
      const matched = this.icebreakers.filter(ib =>
        ib.tags.some(tag => userInterests.includes(tag))
      );

      const icebreakers = matched.length >= count
        ? matched.slice(0, count)
        : [
            ...matched,
            ...this.icebreakers
              .filter(ib => !matched.includes(ib))
              .slice(0, count - matched.length),
          ];

      return {
        icebreakers,
        personalized: matched.length > 0,
        basedOn: userInterests,
      };
    } catch (error: any) {
      logger.error('Failed to get personalized icebreakers:', error);
      throw error;
    }
  }

  async trackUsage(icebreakerId: string, userId: string): Promise<void> {
    try {
      logger.debug('Icebreaker used', { icebreakerId, userId });
      const icebreaker = this.icebreakers.find(ib => ib.id === icebreakerId);
      if (icebreaker) {
        icebreaker.popularity = Math.min(100, icebreaker.popularity + 0.1);
      }
    } catch (error: any) {
      logger.error('Failed to track icebreaker usage:', error);
    }
  }

  async addCustomIcebreaker(icebreaker: Omit<Icebreaker, 'id'>): Promise<Icebreaker> {
    try {
      const newIcebreaker: Icebreaker = {
        ...icebreaker,
        id: `custom_${Date.now()}`,
      };
      this.icebreakers.push(newIcebreaker);
      logger.info('Custom icebreaker added', { id: newIcebreaker.id });
      return newIcebreaker;
    } catch (error: any) {
      logger.error('Failed to add custom icebreaker:', error);
      throw error;
    }
  }

  getTotalCount(): number {
    return this.icebreakers.length;
  }
}

export const icebreakerService = new IcebreakerService();
export default icebreakerService;
