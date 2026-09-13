import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiRouterService } from '../../modules/ai-router/ai-router.service';
import { ProviderFallbackService } from './provider-fallback.service';

export interface AIRouterDecision {
  model: string;
  reason: string;
  confidence: number;
}

@Injectable()
export class NovaAiOsService {
  private readonly logger = new Logger(NovaAiOsService.name);

  constructor(
    private prisma: PrismaService,
    private aiRouterService: AiRouterService,
    private fallback: ProviderFallbackService,
  ) {}

  // AI Router: routes to a real, configured provider based on task type
  routeAiTask(taskType: string, complexity: string): AIRouterDecision {
    const providerGroups: Record<string, { name: string; model: string }[]> = {
      code: this.availableFrom(this.fallback.getCodeProviders()),
      image: this.availableFrom(this.fallback.getImageProviders()),
    };
    const candidates = providerGroups[taskType] || this.availableFrom(this.fallback.getChatProviders());

    if (candidates.length === 0) {
      throw new ServiceUnavailableException(
        'No AI provider is configured. Add an API key (e.g. GROQ_API_KEY) to enable AI features.',
      );
    }

    const provider = candidates[0].name;
    return {
      model: candidates[0].model,
      reason: `Routed to configured provider: ${provider} (${complexity} ${taskType} task)`,
      confidence: 1,
    };
  }

  private availableFrom(providers: { name: string; check: () => boolean }[]): { name: string; model: string }[] {
    const modelMap: Record<string, string> = {
      groq: 'allam-2-7b',
      gemini: 'gemini-2.5-flash',
      openrouter: 'meta-llama/llama-3.3-70b-instruct',
      deepseek: 'deepseek-chat',
      mistral: 'mistral-small-latest',
      fal: 'fal-ai/flux/dev',
      stability: 'sd3-large',
      pollinations: 'pollinations-flux',
    };
    return providers.filter((p) => p.check()).map((p) => ({ name: p.name, model: modelMap[p.name] || p.name }));
  }

  // AI Conversation management
  async createConversation(userId: string, title?: string) {
    return this.prisma.aIConversation.create({
      data: {
        userId,
        title: title || 'New Conversation',
        model: 'ai-router',
      },
    });
  }

  async sendMessage(conversationId: string, userId: string, content: string) {
    const startedAt = Date.now();
    const conversation = await this.prisma.aIConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.userId !== userId) {
      throw new Error('Conversation not found');
    }

    // Save user message
    const userMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'USER',
        content,
      },
    });

    const previousMessages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    previousMessages.reverse();

    const formattedMessages = previousMessages.map((m) => ({
      role: m.role.toLowerCase() as any,
      content: m.content,
    }));
    formattedMessages.push({ role: 'user', content });

    let aiResponseContent: string;
    let finalModel = 'ai-router';

    try {
      const aiRes = await this.aiRouterService.routeToChat(formattedMessages);
      aiResponseContent = aiRes.data.content;
      finalModel = aiRes.model || 'ai-router';
    } catch (error) {
      this.logger.error('Failed to get AI response', error);
      throw error;
    }

    // Save AI response
    const aiMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: aiResponseContent,
        model: finalModel,
        tokensUsed: this.estimateTokens(content + aiResponseContent),
        responseTime: Date.now() - startedAt,
      },
    });

    // Update conversation
    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 2 },
        updatedAt: new Date(),
      },
    });

    return { userMessage, aiMessage, model: finalModel };
  }

  async getConversations(userId: string) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
  }

  async getMessages(conversationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });
  }

  async findConversationById(conversationId: string) {
    return this.prisma.aIConversation.findUnique({ where: { id: conversationId } });
  }

  // AI Personalization - reads real user settings and reputation
  async getUserPreferences(userId: string) {
    const settings = await this.prisma.userSettings.findUnique({ where: { userId } });
    const reputation = await this.prisma.reputation.findUnique({ where: { userId } });
    return {
      aiPersonalization: settings?.aiPersonalization ?? true,
      contentFilter: settings?.contentFilter ?? 'medium',
      level: reputation?.level ?? 1,
      expertiseScore: reputation?.expertiseScore ?? 0,
    };
  }

  // AI Content Scoring - heuristic analysis of the actual content
  async scoreContent(content: string): Promise<{ score: number; tags: string[]; sentiment: string }> {
    const wordCount = content.split(/\s+/).length;
    const hasCode = /```|function|const|let|var|class|import/.test(content);
    const hasQuestion = /\?/.test(content);
    const hasEmoji = /[\u{1F600}-\u{1F64F}]/u.test(content);
    const exclamationCount = (content.match(/!/g) || []).length;

    let sentiment = 'neutral';
    if (hasEmoji || exclamationCount > 2) sentiment = 'excited';
    else if (hasQuestion) sentiment = 'inquiring';

    let score = 50;
    if (wordCount > 50) score += 10;
    if (wordCount > 200) score += 10;
    if (hasCode) score += 15;
    if (hasQuestion) score += 5;

    const tags: string[] = [];
    if (hasCode) tags.push('code');
    if (hasQuestion) tags.push('question');
    if (wordCount < 20) tags.push('short');

    return { score: Math.min(100, score), tags, sentiment };
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
