import { createLogger } from '@flamoral/shared';
import { Icebreaker, IcebreakerSuggestion } from '../types/enhanced-types';

const logger = createLogger('icebreaker-service');

export class IcebreakerService {
  private icebreakers: Icebreaker[] = [];

  constructor() {
    this.initializeIcebreakers();
  }

  /**
   * Initialize icebreaker database
   */
  private initializeIcebreakers(): void {
    this.icebreakers = [
      // Fun & Casual
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
        text: 'What's your go-to karaoke song?',
        popularity: 88,
        tags: ['music', 'fun', 'casual'],
      },
      {
        id: '3',
        category: 'Fun',
        text: 'Coffee or tea? ☕',
        popularity: 92,
        tags: ['preferences', 'casual'],
      },
      {
        id: '4',
        category: 'Fun',
        text: 'What's the best trip you've ever taken?',
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

      // Hobbies & Interests
      {
        id: '6',
        category: 'Hobbies',
        text: 'What do you like to do on weekends?',
        popularity: 93,
        tags: ['hobbies', 'lifestyle'],
      },
      {
        id: '7',
        category: 'Hobbies',
        text: 'Are you more of a Netflix binge-watcher or outdoor adventurer?',
        popularity: 89,
        tags: ['lifestyle', 'preferences'],
      },
      {
        id: '8',
        category: 'Hobbies',
        text: 'What's your favorite way to stay active?',
        popularity: 85,
        tags: ['fitness', 'hobbies'],
      },
      {
        id: '9',
        category: 'Hobbies',
        text: 'What book are you currently reading?',
        popularity: 82,
        tags: ['books', 'culture'],
      },
      {
        id: '10',
        category: 'Hobbies',
        text: 'What's your favorite cuisine?',
        popularity: 91,
        tags: ['food', 'lifestyle'],
      },

      // Deep & Meaningful
      {
        id: '11',
        category: 'Deep',
        text: 'What's something you're passionate about?',
        popularity: 86,
        tags: ['deep', 'values'],
      },
      {
        id: '12',
        category: 'Deep',
        text: 'What's your biggest goal for this year?',
        popularity: 84,
        tags: ['goals', 'future'],
      },
      {
        id: '13',
        category: 'Deep',
        text: 'If you could master any skill instantly, what would it be?',
        popularity: 88,
        tags: ['dreams', 'aspirations'],
      },
      {
        id: '14',
        category: 'Deep',
        text: 'What's the best advice you've ever received?',
        popularity: 83,
        tags: ['wisdom', 'deep'],
      },

      // Quirky & Creative
      {
        id: '15',
        category: 'Quirky',
        text: 'If you were a superhero, what would your superpower be?',
        popularity: 86,
        tags: ['fun', 'creative'],
      },
      {
        id: '16',
        category: 'Quirky',
        text: 'What's the weirdest food combination you actually enjoy?',
        popularity: 85,
        tags: ['food', 'quirky'],
      },
      {
        id: '17',
        category: 'Quirky',
        text: 'If you could switch lives with anyone for a day, who would it be?',
        popularity: 84,
        tags: ['fun', 'creative'],
      },

      // Music & Entertainment
      {
        id: '18',
        category: 'Entertainment',
        text: 'What's the last concert you went to?',
        popularity: 87,
        tags: ['music', 'events'],
      },
      {
        id: '19',
        category: 'Entertainment',
        text: 'What show are you binge-watching right now?',
        popularity: 90,
        tags: ['tv', 'entertainment'],
      },
      {
        id: '20',
        category: 'Entertainment',
        text: 'What's your all-time favorite movie?',
        popularity: 89,
        tags: ['movies', 'entertainment'],
      },

      // Quick & Easy
      {
        id: '21',
        category: 'Quick',
        text: 'Dogs or cats? 🐶🐱',
        popularity: 94,
        tags: ['pets', 'preferences'],
      },
      {
        id: '22',
        category: 'Quick',
        text: 'Morning person or night owl? 🌅🌙',
        popularity: 92,
        tags: ['lifestyle', 'preferences'],
      },
      {
        id: '23',
        category: 'Quick',
        text: 'Beach or mountains? 🏖️⛰️',
        popularity: 93,
        tags: ['travel', 'preferences'],
      },
      {
        id: '24',
        category: 'Quick',
        text: 'Sweet or savory?',
        popularity: 91,
        tags: ['food', 'preferences'],
      },

      // Dating-Specific
      {
        id: '25',
        category: 'Dating',
        text: 'What's your idea of a perfect first date?',
        popularity: 96,
        tags: ['dating', 'romance'],
      },
      {
        id: '26',
        category: 'Dating',
        text: 'What's the most romantic thing you've ever done?',
        popularity: 87,
        tags: ['romance', 'experiences'],
      },
      {
        id: '27',
        category: 'Dating',
        text: 'What makes you laugh the most?',
        popularity: 94,
        tags: ['humor', 'personality'],
      },
      {
        id: '28',
        category: 'Dating',
        text: 'What's your love language?',
        popularity: 88,
        tags: ['romance', 'compatibility'],
      },

      // Work & Life
      {
        id: '29',
        category: 'Life',
        text: 'What do you do for work, and do you love it?',
        popularity: 85,
        tags: ['career', 'work'],
      },
      {
        id: '30',
        category: 'Life',
        text: 'If you could quit your job and do anything, what would you do?',
        popularity: 86,
        tags: ['dreams', 'career'],
      },
    ];
  }

  /**
   * Get personalized icebreaker suggestions
   */
  async getSuggestions(
    userId: string,
    otherUserId: string,
    count: number = 5
  ): Promise<IcebreakerSuggestion> {
    try {
      // In production, fetch user profiles and interests from user service
      // For now, return random popular icebreakers

      // Get top icebreakers by popularity
      const topIcebreakers = [...this.icebreakers]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, count * 2);

      // Randomly select from top icebreakers
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
        personalized: false, // Would be true if using user data
        basedOn: [],
      };
    } catch (error: any) {
      logger.error('Failed to get icebreaker suggestions:', error);
      throw error;
    }
  }

  /**
   * Get icebreakers by category
   */
  async getByCategory(category: string, count: number = 10): Promise<Icebreaker[]> {
    const filtered = this.icebreakers
      .filter(ib => ib.category === category)
      .slice(0, count);

    return filtered;
  }

  /**
   * Get random icebreaker
   */
  async getRandom(): Promise<Icebreaker> {
    const index = Math.floor(Math.random() * this.icebreakers.length);
    return this.icebreakers[index];
  }

  /**
   * Search icebreakers by tags
   */
  async searchByTags(tags: string[], count: number = 10): Promise<Icebreaker[]> {
    const results = this.icebreakers.filter(ib =>
      tags.some(tag => ib.tags.includes(tag))
    );

    return results.slice(0, count);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set(this.icebreakers.map(ib => ib.category));
    return Array.from(categories);
  }

  /**
   * Get personalized icebreakers based on shared interests
   */
  async getPersonalizedByInterests(
    userInterests: string[],
    count: number = 5
  ): Promise<IcebreakerSuggestion> {
    try {
      // Match icebreakers with user interests
      const matched = this.icebreakers.filter(ib =>
        ib.tags.some(tag => userInterests.includes(tag))
      );

      // If we have enough matched icebreakers, use them
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

  /**
   * Track icebreaker usage (for analytics)
   */
  async trackUsage(icebreakerId: string, userId: string): Promise<void> {
    try {
      // In production, save to analytics database
      logger.debug('Icebreaker used', { icebreakerId, userId });

      // Update popularity based on usage
      const icebreaker = this.icebreakers.find(ib => ib.id === icebreakerId);
      if (icebreaker) {
        icebreaker.popularity = Math.min(100, icebreaker.popularity + 0.1);
      }
    } catch (error: any) {
      logger.error('Failed to track icebreaker usage:', error);
    }
  }

  /**
   * Add custom icebreaker
   */
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

  /**
   * Get total icebreaker count
   */
  getTotalCount(): number {
    return this.icebreakers.length;
  }
}

export const icebreakerService = new IcebreakerService();
export default icebreakerService;
