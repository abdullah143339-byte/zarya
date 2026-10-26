/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../../common/decorators/auth.decorator';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { AuditService } from '../../common/services/audit.service';
import { ReputationService } from '../../common/services/reputation.service';
import { WalletService } from '../../common/services/wallet.service';
import { SearchService } from '../../common/services/search.service';
import { NovaAiOsService } from '../../common/services/nova-ai-os.service';
import { RagService } from '../../common/services/rag.service';

@ApiTags('Security & Advanced')
@Controller()
export class SecurityController {
  constructor(
    private auditService: AuditService,
    private reputationService: ReputationService,
    private walletService: WalletService,
    private searchService: SearchService,
    private novaAiOsService: NovaAiOsService,
    private ragService: RagService,
  ) {}

  // ===== ROUTE ALIASES (for backwards compatibility) =====

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get reputation leaderboard (alias)' })
  async getLeaderboardAlias(@Query('page') page = 1, @Query('limit') limit = 50) {
    const data = await this.reputationService.getLeaderboard(page, limit);
    return { success: true, data };
  }

  @Get('wallet/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance (alias)' })
  async getWalletAlias(@CurrentUser() user: any) {
    const data = await this.walletService.getWallet(user.id);
    return { success: true, data };
  }

  @Post('ai/chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send AI chat message (alias)' })
  async aiChatAlias(@CurrentUser('id') userId: string, @Body() body: { message: string; conversationId?: string }) {
    let conversationId = body.conversationId;
    if (!conversationId) {
      const conv = await this.novaAiOsService.createConversation(userId, 'Quick Chat');
      conversationId = conv.id;
    }
    const result = await this.novaAiOsService.sendMessage(conversationId, userId, body.message);
    return { success: true, data: result };
  }

  // ===== AUDIT & SECURITY =====

  @Get('security/audit-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user audit logs' })
  async getAuditLogs(@CurrentUser() user: any, @Query('page') page = 1) {
    const data = await this.auditService.getAuditLogs(user.id, page);
    return { success: true, data };
  }

  @Get('admin/audit-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: get all audit logs' })
  async adminGetAuditLogs(@CurrentUser() user: any, @Query('page') page = 1) {
    const data = await this.auditService.getAllAuditLogs(page);
    return { success: true, data };
  }

  @Get('security/events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get security events' })
  async getSecurityEvents(@CurrentUser() user: any) {
    const data = await this.auditService.getSecurityEvents(user.id);
    return { success: true, data };
  }

  // ===== REPUTATION =====

  @Get('reputation/leaderboard')
  @ApiOperation({ summary: 'Get reputation leaderboard' })
  @ApiQuery({ name: 'page', required: false })
  async getLeaderboard(@Query('page') page = 1) {
    const data = await this.reputationService.getLeaderboard(page);
    return { success: true, data };
  }

  @Get('reputation/:userId')
  @ApiOperation({ summary: 'Get user reputation' })
  async getReputation(@Param('userId') userId: string) {
    const data = await this.reputationService.getReputation(userId);
    return { success: true, data };
  }

  // ===== WALLET =====

  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance' })
  async getWallet(@CurrentUser() user: any) {
    const data = await this.walletService.getWallet(user.id);
    return { success: true, data };
  }

  @Get('wallet/transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction history' })
  async getTransactions(@CurrentUser() user: any, @Query('page') page = 1) {
    const data = await this.walletService.getTransactions(user.id, page);
    return { success: true, data };
  }

  // ===== SEARCH =====

  @Get('search')
  @ApiOperation({ summary: 'Global search across users, posts, communities' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false })
  async globalSearch(
    @Query('q') query: string,
    @Query('page') page = 1,
    @CurrentUser() user?: any,
  ) {
    const data = await this.searchService.globalSearch(query, user?.id, page);
    return { success: true, data };
  }

  @Get('search/trending')
  @ApiOperation({ summary: 'Get trending posts' })
  async getTrendingPosts(@Query('limit') limit = 20) {
    const data = await this.searchService.getTrendingPosts(limit);
    return { success: true, data };
  }

  @Get('search/trending-tags')
  @ApiOperation({ summary: 'Get trending tags' })
  async getTrendingTags(@Query('limit') limit = 20) {
    const data = await this.searchService.getTrendingTags(limit);
    return { success: true, data };
  }

  @Get('search/suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'q', required: true })
  async getSearchSuggestions(@Query('q') query: string) {
    const data = await this.searchService.getSearchSuggestions(query);
    return { success: true, data };
  }

  // ===== AI (NOVAX AI OS) =====

  @Get('ai/route')
  @ApiOperation({ summary: 'Get AI routing decision' })
  @ApiQuery({ name: 'task', required: true })
  @ApiQuery({ name: 'complexity', required: false })
  async routeAiTask(@Query('task') task: string, @Query('complexity') complexity = 'medium') {
    const data = await this.novaAiOsService.routeAiTask(task, complexity);
    return { success: true, data };
  }

  @Post('ai/score')
  @ApiOperation({ summary: 'Score content with AI' })
  async scoreContent(@Body() body: { content: string }) {
    const data = await this.novaAiOsService.scoreContent(body.content);
    return { success: true, data };
  }

  // ===== RAG (RETRIEVAL-AUGMENTED GENERATION) =====

  @Post('rag/index/post/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Index a post for RAG search' })
  async indexPostForRag(@Param('id') postId: string) {
    await this.ragService.indexPost(postId);
    return { success: true, message: 'Post indexed for RAG' };
  }

  @Post('rag/index/rebuild')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rebuild RAG index with recent content' })
  async rebuildRagIndex() {
    const data = await this.ragService.indexRecentContent();
    return { success: true, data };
  }

  @Post('rag/query')
  @ApiOperation({ summary: 'Query with RAG context' })
  async ragQuery(@Body() body: { query: string }, @CurrentUser() user?: any) {
    const data = await this.ragService.queryWithContext(body.query, user?.id);
    return { success: true, data };
  }

  @Get('rag/stats')
  @ApiOperation({ summary: 'Get RAG index stats' })
  async getRagStats() {
    const data = this.ragService.getStats();
    return { success: true, data };
  }
}
