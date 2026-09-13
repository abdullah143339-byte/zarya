/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { Public } from '../../common/decorators/auth.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(@CurrentUser('id') userId: string, @Body() body: any) {
    return ApiResponseDto.ok(await this.postsService.create(userId, body), 'Post created');
  }

  @Get('feed')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getFeed(@CurrentUser('id') userId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return ApiResponseDto.ok(await this.postsService.getFeed(userId, page || 1, limit || 20));
  }

  @Get('reels/public')
  @Public()
  async getPublicReels(@Query('page') page?: number, @Query('limit') limit?: number, @Query('sort') sort?: string) {
    return ApiResponseDto.ok(await this.postsService.getPublicReels(page || 1, limit || 8, sort));
  }

  @Get('user/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  async getUserPosts(@CurrentUser('id') viewerId: string | undefined, @Param('userId') userId: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return ApiResponseDto.ok(await this.postsService.getUserPosts(userId, viewerId, page || 1, limit || 20));
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getById(@CurrentUser('id') viewerId: string | undefined, @Param('id') id: string) {
    return ApiResponseDto.ok(await this.postsService.getById(id, viewerId));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return ApiResponseDto.ok(await this.postsService.delete(id, userId));
  }

  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async react(@CurrentUser('id') userId: string, @Param('id') postId: string, @Body('type') type?: string) {
    return ApiResponseDto.ok(await this.postsService.react(userId, postId, type));
  }

  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async comment(@CurrentUser('id') userId: string, @Param('id') postId: string, @Body('content') content: string, @Body('parentId') parentId?: string) {
    return ApiResponseDto.ok(await this.postsService.addComment(userId, postId, content, parentId));
  }

  @Get(':id/comments')
  @Public()
  async getComments(@Param('id') postId: string, @Query('page') page?: number) {
    return ApiResponseDto.ok(await this.postsService.getComments(postId, page || 1));
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async toggleBookmark(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return ApiResponseDto.ok(await this.postsService.toggleBookmark(userId, postId));
  }

  @Get('bookmarks/mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyBookmarks(@CurrentUser('id') userId: string, @Query('page') page?: number) {
    return ApiResponseDto.ok(await this.postsService.getBookmarks(userId, page || 1));
  }

  @Post(':id/share')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async sharePost(@CurrentUser('id') userId: string, @Param('id') postId: string, @Body('platform') platform?: string) {
    return ApiResponseDto.ok(await this.postsService.sharePost(userId, postId, platform));
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async reportPost(@CurrentUser('id') userId: string, @Param('id') postId: string, @Body() body: any) {
    return ApiResponseDto.ok(await this.postsService.reportPost(userId, postId, body?.reason || 'OTHER', body?.description), 'Post reported');
  }

  @Post(':id/view')
  @UseGuards(OptionalJwtAuthGuard)
  async recordView(@Param('id') postId: string) {
    return ApiResponseDto.ok(await this.postsService.recordView(postId), 'View recorded');
  }
}
