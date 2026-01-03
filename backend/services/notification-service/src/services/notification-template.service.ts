/**
 * Notification Template Service
 * Handles notification templates with i18n support
 */

import { db } from '../config/database';
import logger from '../utils/logger';
import { NotificationType } from '../types';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  language: string;
  title: string;
  body: string;
  subtitle?: string;
  category?: string;
  imageUrl?: string;
  actionUrl?: string;
  variables: string[];
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RenderTemplateOptions {
  type: NotificationType;
  language?: string;
  variables: Record<string, string>;
}

export class NotificationTemplateService {
  private defaultLanguage: string = 'en';
  private templateCache: Map<string, NotificationTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default templates for all notification types
   */
  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        type: NotificationType.NEW_MATCH,
        language: 'en',
        title: "It's a Match!",
        body: "You and {{matchUserName}} liked each other!",
        category: 'social',
        actionUrl: '/chat/{{matchUserId}}',
        variables: ['matchUserName', 'matchUserId'],
      },
      {
        type: NotificationType.NEW_MESSAGE,
        language: 'en',
        title: '{{senderName}}',
        body: '{{messagePreview}}',
        category: 'message',
        actionUrl: '/chat/{{senderId}}',
        variables: ['senderName', 'messagePreview', 'senderId'],
      },
      {
        type: NotificationType.SUPER_LIKE,
        language: 'en',
        title: 'You got a Super Like!',
        body: '{{likerName}} super liked you!',
        category: 'social',
        actionUrl: '/profile/{{likerId}}',
        variables: ['likerName', 'likerId'],
      },
      {
        type: NotificationType.PROFILE_VIEW,
        language: 'en',
        title: 'Profile View',
        body: '{{viewerName}} viewed your profile',
        category: 'social',
        actionUrl: '/profile/{{viewerId}}',
        variables: ['viewerName', 'viewerId'],
      },
      {
        type: NotificationType.MATCH_EXPIRING,
        language: 'en',
        title: 'Match Expiring Soon',
        body: 'Your match with {{matchUserName}} expires in {{hoursLeft}} hours',
        category: 'reminder',
        actionUrl: '/chat/{{matchUserId}}',
        variables: ['matchUserName', 'matchUserId', 'hoursLeft'],
      },
      {
        type: NotificationType.DAILY_PICKS,
        language: 'en',
        title: 'Daily Picks Ready!',
        body: 'Check out {{count}} new profiles picked just for you',
        category: 'engagement',
        actionUrl: '/discover',
        variables: ['count'],
      },
      {
        type: NotificationType.BOOST_ACTIVATED,
        language: 'en',
        title: 'Boost Active!',
        body: 'Your profile is boosted for the next {{durationMinutes}} minutes',
        category: 'feature',
        actionUrl: '/profile',
        variables: ['durationMinutes'],
      },
      {
        type: NotificationType.SUBSCRIPTION_EXPIRING,
        language: 'en',
        title: 'Subscription Expiring',
        body: 'Your {{planName}} subscription expires in {{daysLeft}} days',
        category: 'account',
        actionUrl: '/settings/subscription',
        variables: ['planName', 'daysLeft'],
      },
      {
        type: NotificationType.VIDEO_CALL_INCOMING,
        language: 'en',
        title: 'Incoming Video Call',
        body: '{{callerName}} is calling you',
        category: 'call',
        actionUrl: '/call/{{callId}}',
        variables: ['callerName', 'callId'],
      },
      {
        type: NotificationType.ACHIEVEMENT_UNLOCKED,
        language: 'en',
        title: 'Achievement Unlocked!',
        body: 'You earned: {{achievementName}}',
        category: 'gamification',
        actionUrl: '/achievements',
        variables: ['achievementName'],
      },
      {
        type: NotificationType.SPEED_DATING,
        language: 'en',
        title: 'Speed Dating Event',
        body: '{{eventName}} is starting soon! Join now to meet new people.',
        category: 'event',
        actionUrl: '/speed-dating/{{eventId}}',
        variables: ['eventName', 'eventId'],
      },
      // Spanish templates
      {
        type: NotificationType.NEW_MATCH,
        language: 'es',
        title: '¡Es un Match!',
        body: '¡A ti y a {{matchUserName}} les gustaron mutuamente!',
        category: 'social',
        actionUrl: '/chat/{{matchUserId}}',
        variables: ['matchUserName', 'matchUserId'],
      },
      {
        type: NotificationType.NEW_MESSAGE,
        language: 'es',
        title: '{{senderName}}',
        body: '{{messagePreview}}',
        category: 'message',
        actionUrl: '/chat/{{senderId}}',
        variables: ['senderName', 'messagePreview', 'senderId'],
      },
      // French templates
      {
        type: NotificationType.NEW_MATCH,
        language: 'fr',
        title: "C'est un Match!",
        body: 'Vous et {{matchUserName}} vous êtes aimés mutuellement!',
        category: 'social',
        actionUrl: '/chat/{{matchUserId}}',
        variables: ['matchUserName', 'matchUserId'],
      },
      {
        type: NotificationType.NEW_MESSAGE,
        language: 'fr',
        title: '{{senderName}}',
        body: '{{messagePreview}}',
        category: 'message',
        actionUrl: '/chat/{{senderId}}',
        variables: ['senderName', 'messagePreview', 'senderId'],
      },
    ];

    try {
      for (const template of defaultTemplates) {
        const existing = await db('notification_templates')
          .where({ type: template.type, language: template.language })
          .first();

        if (!existing) {
          await db('notification_templates').insert({
            type: template.type,
            language: template.language,
            title: template.title,
            body: template.body,
            category: template.category,
            action_url: template.actionUrl,
            variables: JSON.stringify(template.variables),
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      logger.info('Default notification templates initialized');
    } catch (error: any) {
      logger.error('Failed to initialize default templates', {
        error: error.message,
      });
    }
  }

  /**
   * Get template by type and language
   */
  async getTemplate(
    type: NotificationType,
    language: string = 'en'
  ): Promise<NotificationTemplate | null> {
    try {
      const cacheKey = `${type}_${language}`;

      // Check cache
      if (this.templateCache.has(cacheKey)) {
        return this.templateCache.get(cacheKey)!;
      }

      // Try to get template for specified language
      let template = await db('notification_templates')
        .where({ type, language, is_active: true })
        .first();

      // Fallback to default language
      if (!template && language !== this.defaultLanguage) {
        template = await db('notification_templates')
          .where({ type, language: this.defaultLanguage, is_active: true })
          .first();
      }

      if (!template) {
        return null;
      }

      const mappedTemplate: NotificationTemplate = {
        id: template.id,
        type: template.type,
        language: template.language,
        title: template.title,
        body: template.body,
        subtitle: template.subtitle,
        category: template.category,
        imageUrl: template.image_url,
        actionUrl: template.action_url,
        variables: typeof template.variables === 'string'
          ? JSON.parse(template.variables)
          : template.variables,
        metadata: typeof template.metadata === 'string'
          ? JSON.parse(template.metadata)
          : template.metadata,
        isActive: template.is_active,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      };

      // Cache template
      this.templateCache.set(cacheKey, mappedTemplate);

      return mappedTemplate;
    } catch (error: any) {
      logger.error('Failed to get template', {
        error: error.message,
        type,
        language,
      });
      return null;
    }
  }

  /**
   * Render template with variables
   */
  async render(options: RenderTemplateOptions): Promise<{
    success: boolean;
    title?: string;
    body?: string;
    subtitle?: string;
    actionUrl?: string;
    category?: string;
    imageUrl?: string;
    error?: string;
  }> {
    try {
      const template = await this.getTemplate(
        options.type,
        options.language || this.defaultLanguage
      );

      if (!template) {
        return {
          success: false,
          error: `Template not found for type: ${options.type}`,
        };
      }

      // Replace variables in title
      let title = template.title;
      let body = template.body;
      let subtitle = template.subtitle;
      let actionUrl = template.actionUrl;

      Object.keys(options.variables).forEach(key => {
        const value = options.variables[key];
        const regex = new RegExp(`{{${key}}}`, 'g');

        title = title.replace(regex, value);
        body = body.replace(regex, value);
        if (subtitle) subtitle = subtitle.replace(regex, value);
        if (actionUrl) actionUrl = actionUrl.replace(regex, value);
      });

      return {
        success: true,
        title,
        body,
        subtitle,
        actionUrl,
        category: template.category,
        imageUrl: template.imageUrl,
      };
    } catch (error: any) {
      logger.error('Failed to render template', {
        error: error.message,
        type: options.type,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create or update template
   */
  async upsertTemplate(template: {
    type: NotificationType;
    language: string;
    title: string;
    body: string;
    subtitle?: string;
    category?: string;
    imageUrl?: string;
    actionUrl?: string;
    variables: string[];
    metadata?: Record<string, any>;
  }): Promise<{
    success: boolean;
    templateId?: string;
    error?: string;
  }> {
    try {
      const existing = await db('notification_templates')
        .where({ type: template.type, language: template.language })
        .first();

      if (existing) {
        // Update existing template
        await db('notification_templates')
          .where({ id: existing.id })
          .update({
            title: template.title,
            body: template.body,
            subtitle: template.subtitle,
            category: template.category,
            image_url: template.imageUrl,
            action_url: template.actionUrl,
            variables: JSON.stringify(template.variables),
            metadata: template.metadata ? JSON.stringify(template.metadata) : null,
            updated_at: new Date(),
          });

        // Clear cache
        const cacheKey = `${template.type}_${template.language}`;
        this.templateCache.delete(cacheKey);

        return {
          success: true,
          templateId: existing.id,
        };
      } else {
        // Insert new template
        const [newTemplate] = await db('notification_templates')
          .insert({
            type: template.type,
            language: template.language,
            title: template.title,
            body: template.body,
            subtitle: template.subtitle,
            category: template.category,
            image_url: template.imageUrl,
            action_url: template.actionUrl,
            variables: JSON.stringify(template.variables),
            metadata: template.metadata ? JSON.stringify(template.metadata) : null,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning('id');

        return {
          success: true,
          templateId: newTemplate.id,
        };
      }
    } catch (error: any) {
      logger.error('Failed to upsert template', {
        error: error.message,
        type: template.type,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all templates
   */
  async getAllTemplates(language?: string): Promise<NotificationTemplate[]> {
    try {
      const query = db('notification_templates').where({ is_active: true });

      if (language) {
        query.where({ language });
      }

      const templates = await query.orderBy('type', 'asc').orderBy('language', 'asc');

      return templates.map(t => ({
        id: t.id,
        type: t.type,
        language: t.language,
        title: t.title,
        body: t.body,
        subtitle: t.subtitle,
        category: t.category,
        imageUrl: t.image_url,
        actionUrl: t.action_url,
        variables: typeof t.variables === 'string' ? JSON.parse(t.variables) : t.variables,
        metadata: typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata,
        isActive: t.is_active,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    } catch (error: any) {
      logger.error('Failed to get all templates', {
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templateCache.clear();
    logger.info('Template cache cleared');
  }
}

export const notificationTemplateService = new NotificationTemplateService();
