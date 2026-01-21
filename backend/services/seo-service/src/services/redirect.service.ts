/**
 * Redirect Management Service
 * Handles 301, 302, 307, 308 redirects with tracking and management
 */

import { v4 as uuidv4 } from 'uuid';
import { Redirect, RedirectCreateInput } from '../types';

export class RedirectService {
  private redirects: Map<string, Redirect> = new Map();
  private sourceIndex: Map<string, string> = new Map(); // source -> id mapping for fast lookup

  /**
   * Create a new redirect rule
   */
  create(input: RedirectCreateInput): Redirect {
    // Validate source URL
    if (!input.source || !input.source.startsWith('/')) {
      throw new Error('Source URL must start with /');
    }

    // Validate destination URL
    if (!input.destination) {
      throw new Error('Destination URL is required');
    }

    // Check for existing redirect from same source
    if (this.sourceIndex.has(input.source)) {
      throw new Error(`Redirect already exists for source: ${input.source}`);
    }

    // Check for redirect loops
    if (this.wouldCreateLoop(input.source, input.destination)) {
      throw new Error('This redirect would create a redirect loop');
    }

    const redirect: Redirect = {
      id: uuidv4(),
      source: this.normalizeUrl(input.source),
      destination: input.destination,
      type: input.type || 301,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      hits: 0,
      notes: input.notes,
    };

    this.redirects.set(redirect.id, redirect);
    this.sourceIndex.set(redirect.source, redirect.id);

    return redirect;
  }

  /**
   * Get redirect by ID
   */
  getById(id: string): Redirect | undefined {
    return this.redirects.get(id);
  }

  /**
   * Get redirect by source URL
   */
  getBySource(source: string): Redirect | undefined {
    const normalizedSource = this.normalizeUrl(source);
    const id = this.sourceIndex.get(normalizedSource);
    if (id) {
      return this.redirects.get(id);
    }
    return undefined;
  }

  /**
   * Find matching redirect (supports wildcards)
   */
  findMatch(url: string): Redirect | undefined {
    const normalizedUrl = this.normalizeUrl(url);

    // Exact match first
    const exactMatch = this.getBySource(normalizedUrl);
    if (exactMatch && exactMatch.enabled) {
      return exactMatch;
    }

    // Wildcard matching (patterns ending with *)
    for (const redirect of this.redirects.values()) {
      if (!redirect.enabled) continue;

      if (redirect.source.endsWith('*')) {
        const prefix = redirect.source.slice(0, -1);
        if (normalizedUrl.startsWith(prefix)) {
          return redirect;
        }
      }
    }

    return undefined;
  }

  /**
   * Update redirect rule
   */
  update(id: string, updates: Partial<Omit<Redirect, 'id' | 'createdAt' | 'hits'>>): Redirect {
    const redirect = this.redirects.get(id);
    if (!redirect) {
      throw new Error(`Redirect not found: ${id}`);
    }

    // If source is changing, update the index
    if (updates.source && updates.source !== redirect.source) {
      const normalizedNewSource = this.normalizeUrl(updates.source);

      // Check if new source conflicts with existing redirect
      if (this.sourceIndex.has(normalizedNewSource)) {
        throw new Error(`Redirect already exists for source: ${normalizedNewSource}`);
      }

      this.sourceIndex.delete(redirect.source);
      this.sourceIndex.set(normalizedNewSource, id);
    }

    // Check for redirect loops if destination is changing
    if (updates.destination && this.wouldCreateLoop(redirect.source, updates.destination)) {
      throw new Error('This redirect would create a redirect loop');
    }

    const updated: Redirect = {
      ...redirect,
      ...updates,
      source: updates.source ? this.normalizeUrl(updates.source) : redirect.source,
      updatedAt: new Date(),
    };

    this.redirects.set(id, updated);
    return updated;
  }

  /**
   * Delete redirect rule
   */
  delete(id: string): boolean {
    const redirect = this.redirects.get(id);
    if (!redirect) {
      return false;
    }

    this.sourceIndex.delete(redirect.source);
    return this.redirects.delete(id);
  }

  /**
   * Enable/disable redirect
   */
  setEnabled(id: string, enabled: boolean): Redirect {
    return this.update(id, { enabled });
  }

  /**
   * Record a hit on a redirect
   */
  recordHit(id: string): void {
    const redirect = this.redirects.get(id);
    if (redirect) {
      redirect.hits++;
      redirect.lastHitAt = new Date();
    }
  }

  /**
   * Get all redirects
   */
  getAll(options?: {
    enabled?: boolean;
    type?: Redirect['type'];
    sortBy?: 'source' | 'hits' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): { redirects: Redirect[]; total: number } {
    let results = Array.from(this.redirects.values());

    // Filter by enabled status
    if (options?.enabled !== undefined) {
      results = results.filter((r) => r.enabled === options.enabled);
    }

    // Filter by type
    if (options?.type) {
      results = results.filter((r) => r.type === options.type);
    }

    const total = results.length;

    // Sort
    if (options?.sortBy) {
      const order = options.sortOrder === 'desc' ? -1 : 1;
      results.sort((a, b) => {
        const aVal = a[options.sortBy!];
        const bVal = b[options.sortBy!];
        if (aVal < bVal) return -1 * order;
        if (aVal > bVal) return 1 * order;
        return 0;
      });
    }

    // Pagination
    if (options?.offset) {
      results = results.slice(options.offset);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return { redirects: results, total };
  }

  /**
   * Bulk import redirects
   */
  bulkImport(redirects: RedirectCreateInput[]): {
    imported: number;
    failed: Array<{ input: RedirectCreateInput; error: string }>;
  } {
    const failed: Array<{ input: RedirectCreateInput; error: string }> = [];
    let imported = 0;

    for (const input of redirects) {
      try {
        this.create(input);
        imported++;
      } catch (error) {
        failed.push({
          input,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { imported, failed };
  }

  /**
   * Export all redirects
   */
  export(format: 'json' | 'csv' | 'nginx' | 'apache' | 'netlify' | 'vercel'): string {
    const redirects = Array.from(this.redirects.values()).filter((r) => r.enabled);

    switch (format) {
      case 'json':
        return JSON.stringify(redirects, null, 2);

      case 'csv':
        const headers = 'source,destination,type,hits,created_at\n';
        const rows = redirects
          .map(
            (r) =>
              `"${r.source}","${r.destination}",${r.type},${r.hits},"${r.createdAt.toISOString()}"`
          )
          .join('\n');
        return headers + rows;

      case 'nginx':
        return redirects
          .map((r) => {
            const directive = r.type === 301 ? 'permanent' : 'redirect';
            return `rewrite ^${this.escapeRegex(r.source)}$ ${r.destination} ${directive};`;
          })
          .join('\n');

      case 'apache':
        return redirects
          .map((r) => `Redirect ${r.type} "${r.source}" "${r.destination}"`)
          .join('\n');

      case 'netlify':
        return redirects.map((r) => `${r.source} ${r.destination} ${r.type}`).join('\n');

      case 'vercel':
        const vercelConfig = {
          redirects: redirects.map((r) => ({
            source: r.source,
            destination: r.destination,
            statusCode: r.type,
          })),
        };
        return JSON.stringify(vercelConfig, null, 2);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Check for redirect chains
   */
  getRedirectChains(): Array<{ chain: string[]; length: number }> {
    const chains: Array<{ chain: string[]; length: number }> = [];

    for (const redirect of this.redirects.values()) {
      if (!redirect.enabled) continue;

      const chain = [redirect.source];
      let currentDest = redirect.destination;
      const visited = new Set<string>([redirect.source]);

      while (true) {
        const nextRedirect = this.getBySource(currentDest);
        if (!nextRedirect || !nextRedirect.enabled) break;
        if (visited.has(nextRedirect.source)) break; // Loop detected

        chain.push(nextRedirect.source);
        visited.add(nextRedirect.source);
        currentDest = nextRedirect.destination;
      }

      if (chain.length > 1) {
        chains.push({ chain: [...chain, currentDest], length: chain.length });
      }
    }

    return chains.sort((a, b) => b.length - a.length);
  }

  /**
   * Normalize URL for consistent matching
   */
  private normalizeUrl(url: string): string {
    // Remove trailing slash (except for root)
    if (url.length > 1 && url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    // Lowercase
    return url.toLowerCase();
  }

  /**
   * Check if redirect would create a loop
   */
  private wouldCreateLoop(source: string, destination: string): boolean {
    const normalizedSource = this.normalizeUrl(source);
    let currentDest = destination;
    const visited = new Set<string>([normalizedSource]);

    while (true) {
      const normalizedDest = this.normalizeUrl(currentDest);

      if (normalizedDest === normalizedSource) {
        return true; // Direct loop back to source
      }

      if (visited.has(normalizedDest)) {
        return true; // Loop detected
      }

      const nextRedirect = this.getBySource(currentDest);
      if (!nextRedirect) break;

      visited.add(normalizedDest);
      currentDest = nextRedirect.destination;
    }

    return false;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate redirect statistics
   */
  getStatistics(): {
    total: number;
    enabled: number;
    disabled: number;
    byType: Record<number, number>;
    totalHits: number;
    topRedirects: Array<{ source: string; destination: string; hits: number }>;
    redirectChains: number;
  } {
    const redirects = Array.from(this.redirects.values());

    return {
      total: redirects.length,
      enabled: redirects.filter((r) => r.enabled).length,
      disabled: redirects.filter((r) => !r.enabled).length,
      byType: {
        301: redirects.filter((r) => r.type === 301).length,
        302: redirects.filter((r) => r.type === 302).length,
        307: redirects.filter((r) => r.type === 307).length,
        308: redirects.filter((r) => r.type === 308).length,
      },
      totalHits: redirects.reduce((sum, r) => sum + r.hits, 0),
      topRedirects: redirects
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 10)
        .map((r) => ({ source: r.source, destination: r.destination, hits: r.hits })),
      redirectChains: this.getRedirectChains().length,
    };
  }
}

export const redirectService = new RedirectService();
