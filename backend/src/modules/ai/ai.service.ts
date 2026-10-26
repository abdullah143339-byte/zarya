import { Injectable, NotFoundException } from '@nestjs/common';
import { NovaAiOsService } from '../../common/services/nova-ai-os.service';

@Injectable()
export class AiService {
  constructor(private novaAi: NovaAiOsService) {}

  async createConversation(userId: string, title?: string, model = 'novax-7b') {
    return this.novaAi.createConversation(userId, title);
  }

  async getConversations(userId: string) {
    return this.novaAi.getConversations(userId);
  }

  async sendMessage(conversationId: string, userId: string, content: string) {
    return this.novaAi.sendMessage(conversationId, userId, content);
  }

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    const conversation = await this.novaAi.findConversationById(conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found');
    }
    return this.novaAi.getMessages(conversationId, page, limit);
  }
}
