import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiIntegrationService } from '../../../common/services/ai-integration.service';
import { ProviderFallbackService } from '../../../common/services/provider-fallback.service';
import { AIProviderResponse, AIChatOptions } from './ai-provider.interface';

@Injectable()
export class ChatProvider {
  constructor(
    private ai: AiIntegrationService,
    private fallback: ProviderFallbackService,
  ) {}

  async generate(options: AIChatOptions): Promise<AIProviderResponse> {
    const start = Date.now();
    const messages = options.messages.map(m => ({ role: m.role, content: m.content }));
    const temp = options.temperature ?? 0.7;

    let data: string;
    let provider = '';
    try {
      const result = await this.fallback.tryProviders(
        this.fallback.getChatProviders(),
        {
          groq: () => this.ai.groqChat(messages, 'allam-2-7b', temp),
          gemini: () => this.ai.geminiGenerate(messages.map(m => m.content).join('\n'), 'gemini-2.5-flash'),
          openrouter: () => this.ai.openRouterChat(messages, 'meta-llama/llama-3.3-70b-instruct', temp),
          deepseek: () => this.ai.deepSeekChat(messages, 'deepseek-chat', temp),
          mistral: () => this.ai.mistralChat(messages, 'mistral-small-latest', temp),
        },
      );
      data = result.data;
      provider = result.provider;
    } catch {
      throw new ServiceUnavailableException('AI chat is unavailable: no AI provider is configured or reachable.');
    }

    let modelName = '';
    switch (provider) {
      case 'groq': modelName = 'allam-2-7b'; break;
      case 'gemini': modelName = 'gemini-2.5-flash'; break;
      case 'openrouter': modelName = 'meta-llama/llama-3.3-70b-instruct'; break;
      case 'deepseek': modelName = 'deepseek-chat'; break;
      case 'mistral': modelName = 'mistral-small-latest'; break;
    }

    return {
      success: true,
      data: { content: data, role: 'assistant' },
      model: modelName,
      provider,
      latency: Date.now() - start,
    };
  }
}
