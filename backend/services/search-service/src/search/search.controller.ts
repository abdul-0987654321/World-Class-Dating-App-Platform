import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';

import { SearchService, SearchFilters, UserIndexData } from './search.service';

class SearchQueryDto {
  query?: string;
  gender?: string;
  ageMin?: number;
  ageMax?: number;
  lat?: number;
  lon?: number;
  radius?: string;
  interests?: string;
  verified?: string;
  online?: string;
  page?: number;
  pageSize?: number;
}

class IndexUserDto {
  displayName!: string;
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
}

class UpdateUserDto {
  displayName?: string;
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
}

class BulkIndexDto {
  users!: UserIndexData[];
}

@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Search users with query and filters
   * GET /api/v1/search
   */
  @Get()
  async searchUsers(@Query() queryDto: SearchQueryDto) {
    const filters: SearchFilters = {};

    if (queryDto.gender) {
      filters.gender = queryDto.gender;
    }

    if (queryDto.ageMin !== undefined) {
      filters.ageMin = Number(queryDto.ageMin);
    }

    if (queryDto.ageMax !== undefined) {
      filters.ageMax = Number(queryDto.ageMax);
    }

    if (queryDto.lat !== undefined && queryDto.lon !== undefined) {
      filters.location = {
        lat: Number(queryDto.lat),
        lon: Number(queryDto.lon),
        radius: queryDto.radius || '50km',
      };
    }

    if (queryDto.interests) {
      filters.interests = queryDto.interests.split(',').map((i) => i.trim());
    }

    if (queryDto.verified !== undefined) {
      filters.verified = queryDto.verified === 'true';
    }

    if (queryDto.online !== undefined) {
      filters.online = queryDto.online === 'true';
    }

    const page = queryDto.page ? Number(queryDto.page) : 1;
    const pageSize = queryDto.pageSize ? Number(queryDto.pageSize) : 20;

    const result = await this.searchService.searchUsers(
      queryDto.query || '',
      filters,
      page,
      pageSize
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get search suggestions for autocomplete
   * GET /api/v1/search/suggestions
   */
  @Get('suggestions')
  async getSuggestions(
    @Query('query') query: string,
    @Query('limit') limit?: string
  ) {
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: [],
      };
    }

    const suggestions = await this.searchService.getSuggestions(
      query,
      limit ? Number(limit) : 10
    );

    return {
      success: true,
      data: suggestions,
    };
  }

  /**
   * Get index statistics
   * GET /api/v1/search/stats
   */
  @Get('stats')
  async getStats() {
    const stats = await this.searchService.getIndexStats();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Index a user
   * POST /api/v1/search/index/:userId
   */
  @Post('index/:userId')
  @HttpCode(HttpStatus.CREATED)
  async indexUser(
    @Param('userId') userId: string,
    @Body() body: IndexUserDto
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (!body.displayName) {
      throw new BadRequestException('displayName is required');
    }

    await this.searchService.indexUser(userId, body);

    return {
      success: true,
      message: `User ${userId} indexed successfully`,
    };
  }

  /**
   * Update a user in the index
   * Post /api/v1/search/index/:userId/update
   */
  @Post('index/:userId/update')
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('userId') userId: string,
    @Body() body: UpdateUserDto
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    await this.searchService.updateUser(userId, body);

    return {
      success: true,
      message: `User ${userId} updated successfully`,
    };
  }

  /**
   * Remove a user from the index
   * DELETE /api/v1/search/index/:userId
   */
  @Delete('index/:userId')
  @HttpCode(HttpStatus.OK)
  async removeFromIndex(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    await this.searchService.removeFromIndex(userId);

    return {
      success: true,
      message: `User ${userId} removed from index`,
    };
  }

  /**
   * Bulk index multiple users
   * POST /api/v1/search/index/bulk
   */
  @Post('index/bulk')
  @HttpCode(HttpStatus.CREATED)
  async bulkIndex(@Body() body: BulkIndexDto) {
    if (!body.users || !Array.isArray(body.users)) {
      throw new BadRequestException('users array is required');
    }

    if (body.users.length === 0) {
      return {
        success: true,
        message: 'No users to index',
        count: 0,
      };
    }

    await this.searchService.bulkIndexUsers(body.users);

    return {
      success: true,
      message: `${body.users.length} users indexed successfully`,
      count: body.users.length,
    };
  }
}
