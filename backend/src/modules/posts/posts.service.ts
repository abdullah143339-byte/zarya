/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(authorId: string, data: { content: string; title?: string; type?: string; tags?: string[]; visibility?: string; media?: any[]; location?: string; allowComments?: boolean; allowRemix?: boolean; allowDownload?: boolean; scheduledAt?: string }) {
    return this.prisma.post.create({
      data: {
        authorId,
        content: data.content,
        title: data.title,
        type: (data.type as any) || 'TEXT',
        visibility: (data.visibility as any) || 'PUBLIC',
        tags: JSON.stringify(data.tags || []),
        media: data.media || undefined,
        location: data.location || null,
        allowComments: data.allowComments ?? true,
        allowRemix: data.allowRemix ?? true,
        allowDownload: data.allowDownload ?? true,
        publishedAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date(),
      },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
  }

  async reportPost(reporterId: string, postId: string, reason: string, description?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const reasonValue = (reason || 'OTHER').toUpperCase().replace(/[ -]/g, '_');
    const valid = ['SPAM', 'HARASSMENT', 'HATE_SPEECH', 'VIOLENCE', 'MISINFORMATION', 'COPYRIGHT', 'SELF_HARM', 'NUDITY', 'SCAM', 'OTHER'];
    const normalized = valid.includes(reasonValue) ? reasonValue : 'OTHER';

    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: 'POST',
        targetId: postId,
        reason: normalized as any,
        description: description || null,
      },
    });
  }

  // Public, no-auth reels feed for guests (TikTok-style landing). Supports
  // "trending" (most reactions) and "latest" ordering.
  async getPublicReels(page = 1, limit = 8, sort?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null, type: 'VIDEO', visibility: 'PUBLIC', publishedAt: { lte: new Date() } };
    const orderBy: any = sort === 'trending'
      ? [{ reactionsCount: 'desc' as const }, { trendingScore: 'desc' as const }]
      : { createdAt: 'desc' as const };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip, take: limit,
        orderBy,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          _count: { select: { comments: true, shares: true, bookmarks: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    const enrichedPosts = posts.map((post) => ({
      ...post,
      isLiked: false,
      isBookmarked: false,
    }));

    return { posts: enrichedPosts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getFeed(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);
    const where: any = {
      deletedAt: null,
      publishedAt: { lte: new Date() },
      OR: [
        { authorId: { in: followingIds } },
        { visibility: 'PUBLIC' },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip, take: limit,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          _count: { select: { comments: true, shares: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);

    const postIds = posts.map((p) => p.id);
    const [reactions, bookmarks] = postIds.length > 0 ? await Promise.all([
      this.prisma.reaction.findMany({
        where: { userId, targetType: 'POST', targetId: { in: postIds } },
        select: { targetId: true },
      }),
      this.prisma.bookmark.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]) : [[], []];
    const likedIds = new Set(reactions.map((r) => r.targetId));
    const bookmarkIds = new Set(bookmarks.map((b) => b.postId));

    const enrichedPosts = posts.map((post) => ({
      ...post,
      isLiked: likedIds.has(post.id),
      isBookmarked: bookmarkIds.has(post.id),
    }));

    return { posts: enrichedPosts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getUserPosts(authorId: string, viewerId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const isOwner = viewerId === authorId;
    const isFollowing = viewerId
      ? !!(await this.prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: authorId } },
        }))
      : false;

    const where: any = { authorId, deletedAt: null };
    if (!isOwner) {
      where.OR = [
        { visibility: 'PUBLIC' },
        ...(isFollowing ? [{ visibility: 'FOLLOWERS' }] : []),
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip, take: limit,
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          _count: { select: { comments: true, shares: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count({ where }),
    ]);
    const postIds = posts.map((p) => p.id);
    const [reactions, bookmarks] = viewerId && postIds.length > 0 ? await Promise.all([
      this.prisma.reaction.findMany({
        where: { userId: viewerId, targetType: 'POST', targetId: { in: postIds } },
        select: { targetId: true },
      }),
      this.prisma.bookmark.findMany({
        where: { userId: viewerId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]) : [[], []];
    const likedIds = new Set(reactions.map((r) => r.targetId));
    const bookmarkIds = new Set(bookmarks.map((b) => b.postId));
    const enrichedPosts = posts.map((post) => ({ ...post, isLiked: likedIds.has(post.id), isBookmarked: bookmarkIds.has(post.id) }));
    return { posts: enrichedPosts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getById(postId: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
        _count: { select: { comments: true, shares: true, bookmarks: true } },
      },
    });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');

    const isOwner = post.authorId === viewerId;
    const isFollowing = viewerId
      ? !!(await this.prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: viewerId, followingId: post.authorId } },
        }))
      : false;
    const canView =
      post.visibility === 'PUBLIC' ||
      isOwner ||
      (post.visibility === 'FOLLOWERS' && isFollowing);

    if (!canView) throw new NotFoundException('Post not found');

    await this.prisma.post.update({ where: { id: postId }, data: { viewCount: { increment: 1 } } });
    return post;
  }

  async recordView(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true, deletedAt: true } });
    if (!post || post.deletedAt) throw new NotFoundException('Post not found');
    await this.prisma.post.update({ where: { id: postId }, data: { viewCount: { increment: 1 } } });
    return { viewRecorded: true };
  }

  async delete(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('Not authorized');
    return this.prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
  }

  async react(userId: string, postId: string, type = 'LIKE') {
    const existing = await this.prisma.reaction.findFirst({
      where: { userId, targetId: postId, targetType: 'POST' },
    });
    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      await this.prisma.post.update({ where: { id: postId }, data: { reactionsCount: { decrement: 1 } } });
      return { reacted: false };
    }
    await this.prisma.reaction.create({
      data: { userId, targetId: postId, targetType: 'POST', type: type as any },
    });
    const post = await this.prisma.post.update({ where: { id: postId }, data: { reactionsCount: { increment: 1 } }, include: { author: true } });
    
    if (post.authorId !== userId) {
      const actor = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.notificationsService.createNotification(post.authorId, {
        type: 'LIKE',
        title: 'New Like',
        body: `${actor?.displayName || actor?.username} liked your post.`,
        actorId: userId,
        data: { postId },
      });
    }

    return { reacted: true, type };
  }

  async addComment(userId: string, postId: string, content: string, parentId?: string) {
    const comment = await this.prisma.comment.create({
      data: { postId, authorId: userId, content, parentId },
      include: { author: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });
    const post = await this.prisma.post.update({ where: { id: postId }, data: { commentsCount: { increment: 1 } }, include: { author: true } });

    if (post.authorId !== userId) {
      const actor = await this.prisma.user.findUnique({ where: { id: userId } });
      await this.notificationsService.createNotification(post.authorId, {
        type: 'COMMENT',
        title: 'New Comment',
        body: `${actor?.displayName || actor?.username} commented on your post.`,
        actorId: userId,
        data: { postId, commentId: comment.id },
      });
    }

    return comment;
  }

  async getComments(postId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.prisma.comment.findMany({
      where: { postId, parentId: null },
      skip, take: limit,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleBookmark(userId: string, postId: string) {
    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing) {
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      await this.prisma.post.update({ where: { id: postId }, data: { bookmarksCount: { decrement: 1 } } });
      return { bookmarked: false };
    }
    await this.prisma.bookmark.create({ data: { userId, postId } });
    await this.prisma.post.update({ where: { id: postId }, data: { bookmarksCount: { increment: 1 } } });
    return { bookmarked: true };
  }

  async getBookmarks(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where: { userId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          post: {
            include: {
              author: { select: { id: true, username: true, displayName: true, avatar: true } },
              _count: { select: { comments: true, shares: true, bookmarks: true } },
            },
          },
        },
      }),
      this.prisma.bookmark.count({ where: { userId } }),
    ]);

    const postIds = items.map((b) => b.postId).filter(Boolean);
    const reactions = postIds.length > 0 ? await this.prisma.reaction.findMany({
      where: { userId, targetType: 'POST', targetId: { in: postIds } },
      select: { targetId: true },
    }) : [];
    const likedIds = new Set(reactions.map((r) => r.targetId));

    const enriched = items.map((b) => ({
      ...b,
      post: { ...b.post, isLiked: likedIds.has(b.postId), isBookmarked: true },
    }));
    return { items: enriched, total, page, totalPages: Math.ceil(total / limit) };
  }

  async sharePost(userId: string, postId: string, platform?: string) {
    await this.prisma.share.create({ data: { userId, postId, platform } });
    await this.prisma.post.update({ where: { id: postId }, data: { sharesCount: { increment: 1 } } });
    return { shared: true };
  }
}
