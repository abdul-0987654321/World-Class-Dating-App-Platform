import DOMPurify from 'dompurify';

/**
 * Sanitization utility for user-generated content
 * Uses DOMPurify to prevent XSS attacks
 */
class SanitizationUtil {
  /**
   * Sanitize HTML content
   * Removes dangerous tags and attributes
   */
  sanitizeHTML(dirty: string): string {
    if (!dirty) {
      return '';
    }

    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['href', 'title', 'target'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
  }

  /**
   * Sanitize plain text
   * Strips all HTML tags
   */
  sanitizeText(text: string): string {
    if (!text) {
      return '';
    }

    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Sanitize user bio/about text
   * Allows limited formatting
   */
  sanitizeBio(bio: string): string {
    if (!bio) {
      return '';
    }

    return DOMPurify.sanitize(bio, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Sanitize URL
   * Ensures URL is safe for use
   */
  sanitizeURL(url: string): string {
    if (!url) {
      return '';
    }

    // Remove dangerous protocols
    const sanitized = DOMPurify.sanitize(url, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    // Validate URL format
    try {
      const parsedUrl = new URL(sanitized);

      // Only allow http and https
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return '';
      }

      return parsedUrl.href;
    } catch {
      return '';
    }
  }

  /**
   * Sanitize message content
   * Allows minimal formatting for chat messages
   */
  sanitizeMessage(message: string): string {
    if (!message) {
      return '';
    }

    return DOMPurify.sanitize(message, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
      ALLOWED_ATTR: [],
    });
  }

  /**
   * Escape special characters for display
   */
  escapeHTML(text: string): string {
    if (!text) {
      return '';
    }

    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Strip all HTML tags
   */
  stripHTML(html: string): string {
    if (!html) {
      return '';
    }

    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * Sanitize user input for search queries
   * Prevents SQL injection and XSS in search
   */
  sanitizeSearchQuery(query: string): string {
    if (!query) {
      return '';
    }

    // Remove all HTML
    let sanitized = this.sanitizeText(query);

    // Remove special SQL characters
    sanitized = sanitized.replace(/[';"`\\]/g, '');

    // Limit length
    return sanitized.substring(0, 100);
  }

  /**
   * Sanitize JSON data
   * Ensures all string values are sanitized
   */
  sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized = { ...obj };

    for (const key in sanitized) {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = this.sanitizeText(sanitized[key]) as T[Extract<keyof T, string>];
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeObject(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize profile data
   */
  sanitizeProfileData(data: {
    bio?: string;
    interests?: string[];
    occupation?: string;
    education?: string;
    location?: string;
  }): typeof data {
    return {
      bio: data.bio ? this.sanitizeBio(data.bio) : undefined,
      interests: data.interests?.map((i) => this.sanitizeText(i)) || undefined,
      occupation: data.occupation ? this.sanitizeText(data.occupation) : undefined,
      education: data.education ? this.sanitizeText(data.education) : undefined,
      location: data.location ? this.sanitizeText(data.location) : undefined,
    };
  }

  /**
   * Configure DOMPurify with additional security hooks
   */
  configureDOMPurify(): void {
    // Add custom hook to prevent data exfiltration
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      // Remove data attributes
      if (typeof node.hasAttribute === 'function') {
        const attributes = node.attributes;
        for (let i = attributes.length - 1; i >= 0; i--) {
          const attr = attributes[i];
          if (attr.name.startsWith('data-') || attr.name.startsWith('on')) {
            node.removeAttribute(attr.name);
          }
        }
      }

      // Ensure links open in new tab and have rel="noopener noreferrer"
      if (node.tagName === 'A' && node.hasAttribute('href')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }
}

// Create singleton instance
export const sanitizationUtil = new SanitizationUtil();

// Configure DOMPurify on module load
sanitizationUtil.configureDOMPurify();

export default sanitizationUtil;
