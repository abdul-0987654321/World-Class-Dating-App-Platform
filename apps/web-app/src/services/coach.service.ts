/**
 * AI Dating Coach Service
 * Connects to the backend AI services for intelligent suggestions
 */

import apiClient, { ApiError } from './api.client';

export interface IcebreakerRequest {
  targetUserId: string;
  targetProfile?: {
    name?: string;
    bio?: string;
    interests?: string[];
    occupation?: string;
  };
  style?: 'casual' | 'witty' | 'thoughtful' | 'flirty';
}

export interface IcebreakerResponse {
  suggestions: string[];
  remainingUses: number;
  context?: string[];
}

export interface ResponseSuggestionRequest {
  conversationId: string;
  recentMessages: Array<{
    content: string;
    senderId: string;
    timestamp: string;
  }>;
  targetProfile?: {
    name?: string;
    interests?: string[];
  };
  tone?: 'friendly' | 'flirty' | 'playful' | 'sincere';
}

export interface ResponseSuggestionResponse {
  suggestions: string[];
  remainingUses: number;
  analysis?: {
    sentiment: string;
    engagementLevel: string;
    recommendedTone: string;
  };
}

export interface ProfileTipRequest {
  currentBio?: string;
  photos?: string[];
  interests?: string[];
  prompts?: Array<{ question: string; answer: string }>;
}

export interface ProfileTipResponse {
  overallScore: number;
  tips: Array<{
    category: 'bio' | 'photos' | 'prompts' | 'interests';
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
    currentIssue?: string;
  }>;
  remainingUses: number;
}

export interface DateIdeaRequest {
  matchId: string;
  location?: string;
  sharedInterests?: string[];
  budgetRange?: 'low' | 'medium' | 'high';
  dateNumber?: number; // First date, second date, etc.
}

export interface DateIdeaResponse {
  ideas: Array<{
    title: string;
    description: string;
    category: string;
    estimatedCost: string;
    duration: string;
    tips: string[];
  }>;
  remainingUses: number;
}

export interface UsageResponse {
  tier: string;
  dailyLimit: number;
  used: number;
  remaining: number;
  resetsAt: string;
}

class CoachService {
  private readonly isMock = !import.meta.env.VITE_API_URL;

  /**
   * Generate icebreaker messages for starting conversations
   */
  async generateIcebreakers(request: IcebreakerRequest): Promise<IcebreakerResponse> {
    if (this.isMock) {
      return this.mockIcebreakers(request);
    }

    try {
      const response = await apiClient.post<{ success: boolean; data: IcebreakerResponse }>(
        '/api/coach/icebreakers',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        throw new Error('Daily limit reached. Upgrade your subscription for more AI suggestions.');
      }
      throw error;
    }
  }

  /**
   * Generate response suggestions for ongoing conversations
   */
  async generateResponseSuggestions(
    request: ResponseSuggestionRequest
  ): Promise<ResponseSuggestionResponse> {
    if (this.isMock) {
      return this.mockResponseSuggestions(request);
    }

    try {
      const response = await apiClient.post<{ success: boolean; data: ResponseSuggestionResponse }>(
        '/api/coach/suggest-response',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        throw new Error('Daily limit reached. Upgrade your subscription for more AI suggestions.');
      }
      throw error;
    }
  }

  /**
   * Get profile improvement tips
   */
  async getProfileTips(request: ProfileTipRequest): Promise<ProfileTipResponse> {
    if (this.isMock) {
      return this.mockProfileTips(request);
    }

    try {
      const response = await apiClient.post<{ success: boolean; data: ProfileTipResponse }>(
        '/api/coach/profile-tips',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        throw new Error('Daily limit reached. Upgrade your subscription for more AI suggestions.');
      }
      throw error;
    }
  }

  /**
   * Generate date ideas based on shared interests
   */
  async generateDateIdeas(request: DateIdeaRequest): Promise<DateIdeaResponse> {
    if (this.isMock) {
      return this.mockDateIdeas(request);
    }

    try {
      const response = await apiClient.post<{ success: boolean; data: DateIdeaResponse }>(
        '/api/coach/date-ideas',
        request
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        throw new Error('Daily limit reached. Upgrade your subscription for more AI suggestions.');
      }
      throw error;
    }
  }

  /**
   * Check current AI usage limits
   */
  async getUsage(): Promise<UsageResponse> {
    if (this.isMock) {
      return {
        tier: 'FREE',
        dailyLimit: 3,
        used: 1,
        remaining: 2,
        resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    const response = await apiClient.get<{ success: boolean; data: UsageResponse }>(
      '/api/coach/usage'
    );
    return response.data;
  }

  // Mock implementations for development
  private mockIcebreakers(request: IcebreakerRequest): IcebreakerResponse {
    const name = request.targetProfile?.name || 'there';
    const interests = request.targetProfile?.interests || [];
    const style = request.style || 'casual';

    const suggestions: Record<string, string[]> = {
      casual: [
        `Hey ${name}! I noticed we both seem to enjoy good conversations. What's something exciting that happened to you this week?`,
        `Hi ${name}! Your profile caught my eye. What's your favorite way to spend a lazy Sunday?`,
        `Hey! I'm curious - if you could travel anywhere tomorrow, where would you go?`,
      ],
      witty: [
        `I'm not great at icebreakers, but I make excellent hot chocolate. That counts for something, right ${name}?`,
        `On a scale of 1 to hiking on the first date, how adventurous are you?`,
        `I was going to start with something clever, but honestly I just think you seem really interesting. Hi!`,
      ],
      thoughtful: [
        `Hi ${name}, I loved reading your profile. ${interests.length > 0 ? `Your interest in ${interests[0]} really caught my attention.` : `You seem like someone with great stories to tell.`} What inspired that passion?`,
        `I believe great connections start with genuine curiosity. What's something you're really excited about right now?`,
        `Your profile feels authentic, which is refreshing. What's one thing you wish more people knew about you?`,
      ],
      flirty: [
        `I have to be honest - I've read your profile three times trying to come up with something clever enough. Hi, I'm officially charmed.`,
        `Something tells me you're trouble... the good kind though. Am I right?`,
        `I don't usually message first, but your smile made me reconsider my entire strategy.`,
      ],
    };

    return {
      suggestions: suggestions[style],
      remainingUses: 2,
      context: interests.slice(0, 3),
    };
  }

  private mockResponseSuggestions(request: ResponseSuggestionRequest): ResponseSuggestionResponse {
    const lastMessage = request.recentMessages[request.recentMessages.length - 1]?.content || '';
    const name = request.targetProfile?.name || 'them';

    // Generate contextual suggestions based on the last message
    let suggestions: string[];

    if (
      lastMessage.toLowerCase().includes('how are you') ||
      lastMessage.toLowerCase().includes("how's it going")
    ) {
      suggestions = [
        `I'm doing great, thanks for asking! Actually got some exciting news today. How about you?`,
        `Pretty good! Been looking forward to hearing from you. What's keeping you busy lately?`,
        `Honestly? Better now that I'm chatting with you. How's your day been?`,
      ];
    } else if (lastMessage.includes('?')) {
      suggestions = [
        `That's such a great question! I'd say... [share your genuine answer]. What about you?`,
        `Hmm, let me think... I love questions like this. Here's my take: [your answer]. Curious to hear yours!`,
        `Interesting you ask that! I've actually thought about this before. [Your answer]. Your turn!`,
      ];
    } else {
      suggestions = [
        `That's really interesting! I'd love to hear more about that.`,
        `I totally get what you mean. It reminds me of... [share a related story]`,
        `That sounds amazing! What got you into that?`,
      ];
    }

    return {
      suggestions,
      remainingUses: 2,
      analysis: {
        sentiment: 'positive',
        engagementLevel: 'high',
        recommendedTone: request.tone || 'friendly',
      },
    };
  }

  private mockProfileTips(request: ProfileTipRequest): ProfileTipResponse {
    const tips: ProfileTipResponse['tips'] = [];
    let score = 70;

    if (!request.currentBio || request.currentBio.length < 100) {
      tips.push({
        category: 'bio' as const,
        priority: 'high' as const,
        suggestion:
          "Add more personality to your bio. Share a unique story, what makes you laugh, or what you're passionate about.",
        currentIssue: 'Your bio is too short to showcase your personality.',
      });
    } else {
      score += 10;
    }

    if (!request.photos || request.photos.length < 4) {
      tips.push({
        category: 'photos' as const,
        priority: 'high' as const,
        suggestion:
          'Add more photos! Profiles with 4+ photos get significantly more matches. Include variety: a clear face shot, full body, doing an activity you enjoy.',
        currentIssue: 'Not enough photos to give a complete picture of who you are.',
      });
    } else {
      score += 10;
    }

    if (!request.interests || request.interests.length < 5) {
      tips.push({
        category: 'interests' as const,
        priority: 'medium' as const,
        suggestion:
          'Add more interests to help the algorithm find better matches and give people conversation starters.',
      });
    } else {
      score += 5;
    }

    if (!request.prompts || request.prompts.length < 2) {
      tips.push({
        category: 'prompts' as const,
        priority: 'medium' as const,
        suggestion:
          "Answer at least 2-3 prompts. They're great conversation starters and help people get to know you beyond your photos.",
      });
    } else {
      score += 5;
    }

    return {
      overallScore: Math.min(score, 100),
      tips,
      remainingUses: 2,
    };
  }

  private mockDateIdeas(request: DateIdeaRequest): DateIdeaResponse {
    const interests = request.sharedInterests || [];
    const budget = request.budgetRange || 'medium';
    const isFirstDate = (request.dateNumber || 1) === 1;

    const ideas = [
      {
        title: isFirstDate ? 'Coffee & Walk in the Park' : 'Rooftop Dinner',
        description: isFirstDate
          ? 'A classic first date that takes the pressure off. Get coffee at a cozy cafe, then take a walk to keep the conversation flowing naturally.'
          : 'Elevate your date with stunning views and great food. The ambiance sets the stage for deeper conversation.',
        category: isFirstDate ? 'Casual' : 'Romantic',
        estimatedCost: isFirstDate ? '$15-25' : '$80-150',
        duration: isFirstDate ? '1-2 hours' : '2-3 hours',
        tips: isFirstDate
          ? [
              'Pick a cafe near a nice walking area',
              'Have a backup plan in case of bad weather',
              'Keep it to 1-2 hours for a first date',
            ]
          : ['Make a reservation in advance', 'Request a table with a view', 'Dress to impress'],
      },
      {
        title: interests.includes('art') ? 'Museum & Art Gallery' : 'Food Market Adventure',
        description: interests.includes('art')
          ? "Explore art together and discover what each of you is drawn to. It's a great way to learn about each other's perspectives."
          : 'Wander through a local food market, try samples together, and maybe pick up ingredients for a future cooking date.',
        category: 'Activity',
        estimatedCost: budget === 'low' ? '$20-30' : '$40-60',
        duration: '2-3 hours',
        tips: [
          'Look up interesting exhibits beforehand',
          'Ask open-ended questions about what they notice',
          'End with a nearby cafe or restaurant',
        ],
      },
      {
        title: 'Cooking Class Together',
        description:
          'Learn something new together while creating (and eating!) something delicious. Perfect for building connection through teamwork.',
        category: 'Interactive',
        estimatedCost: budget === 'high' ? '$100-150' : '$60-80',
        duration: '2-3 hours',
        tips: [
          'Choose a cuisine you both want to try',
          'Look for BYOB classes to add wine',
          'Ask about dietary restrictions first',
        ],
      },
    ];

    return {
      ideas,
      remainingUses: 2,
    };
  }
}

export const coachService = new CoachService();
export default coachService;
