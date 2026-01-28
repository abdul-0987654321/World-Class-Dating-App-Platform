import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';

export interface SearchFilters {
  gender?: string;
  ageMin?: number;
  ageMax?: number;
  location?: {
    lat: number;
    lon: number;
    radius: string;
  };
  interests?: string[];
  verified?: boolean;
  online?: boolean;
}

export interface UserIndexData {
  userId: string;
  displayName: string;
  bio?: string;
  gender?: string;
  age?: number;
  location?: {
    lat: number;
    lon: number;
  };
  interests?: string[];
  verified?: boolean;
  online?: boolean;
  lastActive?: Date;
  photoUrls?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SearchResult {
  userId: string;
  displayName: string;
  score: number;
  highlights?: Record<string, string[]>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  pageSize: number;
  took: number;
}

@Injectable()
export class SearchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SearchService.name);
  private client: Client;
  private readonly indexName = 'flamoral_users';

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_API_KEY
        ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
        : process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD
          ? {
              username: process.env.ELASTICSEARCH_USERNAME,
              password: process.env.ELASTICSEARCH_PASSWORD,
            }
          : undefined,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const health = await this.client.cluster.health({});
      this.logger.log(`Elasticsearch cluster health: ${health.status}`);

      // Create index if it doesn't exist
      const indexExists = await this.client.indices.exists({ index: this.indexName });
      if (!indexExists) {
        await this.createIndex();
      }
    } catch (error) {
      this.logger.error('Failed to connect to Elasticsearch', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }

  private async createIndex(): Promise<void> {
    await this.client.indices.create({
      index: this.indexName,
      body: {
        settings: {
          number_of_shards: 3,
          number_of_replicas: 1,
          analysis: {
            analyzer: {
              user_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding'],
              },
            },
          },
        },
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            displayName: {
              type: 'text',
              analyzer: 'user_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            bio: {
              type: 'text',
              analyzer: 'user_analyzer',
            },
            gender: { type: 'keyword' },
            age: { type: 'integer' },
            location: { type: 'geo_point' },
            interests: { type: 'keyword' },
            verified: { type: 'boolean' },
            online: { type: 'boolean' },
            lastActive: { type: 'date' },
            photoUrls: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      },
    });

    this.logger.log(`Created Elasticsearch index: ${this.indexName}`);
  }

  /**
   * Search for users based on query and filters
   */
  async searchUsers(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchResponse> {
    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search on displayName and bio
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query.trim(),
          fields: ['displayName^3', 'bio'],
          fuzziness: 'AUTO',
        },
      });
    }

    // Apply filters
    if (filters.gender) {
      filter.push({ term: { gender: filters.gender } });
    }

    if (filters.ageMin !== undefined || filters.ageMax !== undefined) {
      const ageRange: any = {};
      if (filters.ageMin !== undefined) ageRange.gte = filters.ageMin;
      if (filters.ageMax !== undefined) ageRange.lte = filters.ageMax;
      filter.push({ range: { age: ageRange } });
    }

    if (filters.location) {
      filter.push({
        geo_distance: {
          distance: filters.location.radius || '50km',
          location: {
            lat: filters.location.lat,
            lon: filters.location.lon,
          },
        },
      });
    }

    if (filters.interests && filters.interests.length > 0) {
      filter.push({
        terms: { interests: filters.interests },
      });
    }

    if (filters.verified !== undefined) {
      filter.push({ term: { verified: filters.verified } });
    }

    if (filters.online !== undefined) {
      filter.push({ term: { online: filters.online } });
    }

    const from = (page - 1) * pageSize;

    const response = await this.client.search({
      index: this.indexName,
      body: {
        from,
        size: pageSize,
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter,
          },
        },
        highlight: {
          fields: {
            displayName: {},
            bio: {},
          },
        },
        sort: [
          { _score: { order: 'desc' } },
          { lastActive: { order: 'desc' } },
        ],
      },
    });

    const hits = response.hits.hits;
    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value || 0;

    const results: SearchResult[] = hits.map((hit: any) => ({
      userId: hit._source.userId,
      displayName: hit._source.displayName,
      score: hit._score || 0,
      highlights: hit.highlight,
    }));

    return {
      results,
      total,
      page,
      pageSize,
      took: response.took,
    };
  }

  /**
   * Index a user document for search
   */
  async indexUser(userId: string, data: Omit<UserIndexData, 'userId'>): Promise<void> {
    await this.client.index({
      index: this.indexName,
      id: userId,
      body: {
        userId,
        ...data,
        updatedAt: new Date(),
      },
      refresh: true,
    });

    this.logger.debug(`Indexed user: ${userId}`);
  }

  /**
   * Remove a user from the search index
   */
  async removeFromIndex(userId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id: userId,
        refresh: true,
      });

      this.logger.debug(`Removed user from index: ${userId}`);
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        this.logger.warn(`User not found in index: ${userId}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const response = await this.client.search({
      index: this.indexName,
      body: {
        size: limit,
        query: {
          bool: {
            should: [
              {
                prefix: {
                  'displayName.keyword': {
                    value: query.trim().toLowerCase(),
                    boost: 2,
                  },
                },
              },
              {
                match_phrase_prefix: {
                  displayName: {
                    query: query.trim(),
                    max_expansions: 50,
                  },
                },
              },
            ],
          },
        },
        _source: ['displayName'],
      },
    });

    const suggestions = response.hits.hits.map(
      (hit: any) => hit._source.displayName as string
    );

    // Remove duplicates
    return [...new Set(suggestions)] as string[];
  }

  /**
   * Update specific fields for a user in the index
   */
  async updateUser(userId: string, data: Partial<UserIndexData>): Promise<void> {
    await this.client.update({
      index: this.indexName,
      id: userId,
      body: {
        doc: {
          ...data,
          updatedAt: new Date(),
        },
      },
      refresh: true,
    });

    this.logger.debug(`Updated user in index: ${userId}`);
  }

  /**
   * Bulk index multiple users
   */
  async bulkIndexUsers(users: UserIndexData[]): Promise<void> {
    if (users.length === 0) return;

    const operations = users.flatMap((user) => [
      { index: { _index: this.indexName, _id: user.userId } },
      { ...user, updatedAt: new Date() },
    ]);

    const response = await this.client.bulk({
      body: operations,
      refresh: true,
    });

    if (response.errors) {
      this.logger.error('Bulk indexing had errors', response.items);
    } else {
      this.logger.log(`Bulk indexed ${users.length} users`);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    const stats = await this.client.indices.stats({ index: this.indexName });
    return stats.indices?.[this.indexName];
  }
}
