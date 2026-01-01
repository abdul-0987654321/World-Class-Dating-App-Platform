import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';

@ApiTags('Communities')
@ApiBearerAuth('JWT-auth')
@Controller('communities')
export class CommunityController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== COMMUNITIES ====================

  @Get()
  @ApiOperation({ summary: 'Get all communities' })
  @ApiResponse({ status: 200, description: 'List of communities' })
  async getCommunities(
    @Headers('authorization') authorization: string,
    @Query('category') category?: string,
  ) {
    const queryParams = category ? `?category=${category}` : '';
    return this.proxyService.get(
      'userService',
      `/api/v1/communities${queryParams}`,
      { Authorization: authorization },
    );
  }

  @Get('joined')
  @ApiOperation({ summary: 'Get joined communities' })
  async getJoinedCommunities(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/communities/joined', {
      Authorization: authorization,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search communities' })
  async searchCommunities(
    @Headers('authorization') authorization: string,
    @Query('q') query: string,
  ) {
    return this.proxyService.get(
      'userService',
      `/api/v1/communities/search?q=${encodeURIComponent(query)}`,
      { Authorization: authorization },
    );
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get community categories' })
  async getCategories(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/communities/categories', {
      Authorization: authorization,
    });
  }

  @Get('events')
  @ApiOperation({ summary: 'Get all upcoming events' })
  async getAllEvents(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/communities/events', {
      Authorization: authorization,
    });
  }

  @Get(':communityId')
  @ApiOperation({ summary: 'Get community by ID' })
  async getCommunity(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
  ) {
    return this.proxyService.get(
      'userService',
      `/api/v1/communities/${communityId}`,
      { Authorization: authorization },
    );
  }

  @Post(':communityId/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a community' })
  async joinCommunity(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/communities/${communityId}/join`,
      {},
      { Authorization: authorization },
    );
  }

  @Post(':communityId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave a community' })
  async leaveCommunity(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/communities/${communityId}/leave`,
      {},
      { Authorization: authorization },
    );
  }

  @Get(':communityId/members')
  @ApiOperation({ summary: 'Get community members' })
  async getMembers(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    const queryString = queryParams.toString();

    return this.proxyService.get(
      'userService',
      `/api/v1/communities/${communityId}/members${queryString ? `?${queryString}` : ''}`,
      { Authorization: authorization },
    );
  }

  // ==================== POSTS ====================

  @Get(':communityId/posts')
  @ApiOperation({ summary: 'Get community posts' })
  async getPosts(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    const queryString = queryParams.toString();

    return this.proxyService.get(
      'userService',
      `/api/v1/communities/${communityId}/posts${queryString ? `?${queryString}` : ''}`,
      { Authorization: authorization },
    );
  }

  @Post(':communityId/posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a post' })
  async createPost(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Body() body: { content: string; images?: string[] },
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/communities/${communityId}/posts`,
      body,
      { Authorization: authorization },
    );
  }

  @Put(':communityId/posts/:postId')
  @ApiOperation({ summary: 'Update a post' })
  async updatePost(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('postId') postId: string,
    @Body() body: { content: string; images?: string[] },
  ) {
    return this.proxyService.put(
      'userService',
      `/api/v1/communities/${communityId}/posts/${postId}`,
      body,
      { Authorization: authorization },
    );
  }

  @Delete(':communityId/posts/:postId')
  @ApiOperation({ summary: 'Delete a post' })
  async deletePost(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('postId') postId: string,
  ) {
    return this.proxyService.delete(
      'userService',
      `/api/v1/communities/${communityId}/posts/${postId}`,
      { Authorization: authorization },
    );
  }

  @Post(':communityId/posts/:postId/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like a post' })
  async likePost(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('postId') postId: string,
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/communities/${communityId}/posts/${postId}/like`,
      {},
      { Authorization: authorization },
    );
  }

  @Delete(':communityId/posts/:postId/like')
  @ApiOperation({ summary: 'Unlike a post' })
  async unlikePost(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('postId') postId: string,
  ) {
    return this.proxyService.delete(
      'userService',
      `/api/v1/communities/${communityId}/posts/${postId}/like`,
      { Authorization: authorization },
    );
  }

  // ==================== COMMENTS ====================

  @Get(':communityId/posts/:postId/comments')
  @ApiOperation({ summary: 'Get post comments' })
  async getComments(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('postId') postId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    const queryString = queryParams.toString();

    return this.proxyService.get(
      'userService',
      `/api/v1/communities/${communityId}/posts/${postId}/comments${queryString ? `?${queryString}` : ''}`,
      { Authorization: authorization },
    );
  }

  @Post(':communityId/posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a comment' })
  async createComment(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('postId') postId: string,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/communities/${communityId}/posts/${postId}/comments`,
      body,
      { Authorization: authorization },
    );
  }

  @Delete(':communityId/posts/:postId/comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  async deleteComment(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.proxyService.delete(
      'userService',
      `/api/v1/communities/${communityId}/posts/${postId}/comments/${commentId}`,
      { Authorization: authorization },
    );
  }

  @Post(':communityId/posts/:postId/comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like a comment' })
  async likeComment(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('postId') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/communities/${communityId}/posts/${postId}/comments/${commentId}/like`,
      {},
      { Authorization: authorization },
    );
  }

  // ==================== EVENTS ====================

  @Get(':communityId/events')
  @ApiOperation({ summary: 'Get community events' })
  async getCommunityEvents(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
  ) {
    return this.proxyService.get(
      'userService',
      `/api/v1/communities/${communityId}/events`,
      { Authorization: authorization },
    );
  }

  @Get(':communityId/events/:eventId')
  @ApiOperation({ summary: 'Get event details' })
  async getEvent(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.proxyService.get(
      'userService',
      `/api/v1/communities/${communityId}/events/${eventId}`,
      { Authorization: authorization },
    );
  }

  @Post(':communityId/events/:eventId/attend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Attend an event' })
  async attendEvent(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/communities/${communityId}/events/${eventId}/attend`,
      {},
      { Authorization: authorization },
    );
  }

  @Delete(':communityId/events/:eventId/attend')
  @ApiOperation({ summary: 'Unattend an event' })
  async unattendEvent(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.proxyService.delete(
      'userService',
      `/api/v1/communities/${communityId}/events/${eventId}/attend`,
      { Authorization: authorization },
    );
  }

  @Get(':communityId/events/:eventId/attendees')
  @ApiOperation({ summary: 'Get event attendees' })
  async getEventAttendees(
    @Headers('authorization') authorization: string,
    @Param('communityId') communityId: string,
    @Param('eventId') eventId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());
    const queryString = queryParams.toString();

    return this.proxyService.get(
      'userService',
      `/api/v1/communities/${communityId}/events/${eventId}/attendees${queryString ? `?${queryString}` : ''}`,
      { Authorization: authorization },
    );
  }
}
