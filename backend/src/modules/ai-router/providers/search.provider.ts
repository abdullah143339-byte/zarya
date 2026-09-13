import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiIntegrationService } from '../../../common/services/ai-integration.service';
import { ProviderFallbackService } from '../../../common/services/provider-fallback.service';
import { AIProviderResponse, AISearchOptions } from './ai-provider.interface';

@Injectable()
export class SearchProvider {
  constructor(
    private ai: AiIntegrationService,
    private fallback: ProviderFallbackService,
  ) {}

  async deepSearch(options: AISearchOptions): Promise<AIProviderResponse> {
    const start = Date.now();

    let summary: string;
    let provider = '';
    let modelName = '';

    try {
      const result = await this.fallback.tryProviders(
        this.fallback.getSearchProviders(),
        {
          gemini: () => this.ai.geminiDeepSearch(options.query),
          groq: () => this.ai.groqChat([
            { role: 'system', content: 'You are a research assistant. Provide a comprehensive, well-structured answer. Format with markdown.' },
            { role: 'user', content: options.query },
          ], 'allam-2-7b', 0.3),
          openrouter: () => this.ai.openRouterChat([
            { role: 'system', content: 'You are a research assistant. Provide a comprehensive, well-structured answer. Format with markdown.' },
            { role: 'user', content: options.query },
          ], 'meta-llama/llama-3.3-70b-instruct', 0.3),
          deepseek: () => this.ai.deepSeekChat([
            { role: 'system', content: 'You are a research assistant. Provide a comprehensive, well-structured answer. Format with markdown.' },
            { role: 'user', content: options.query },
          ], 'deepseek-chat', 0.3),
          mistral: () => this.ai.mistralChat([
            { role: 'system', content: 'You are a research assistant. Provide a comprehensive, well-structured answer. Format with markdown.' },
            { role: 'user', content: options.query },
          ], 'mistral-small-latest', 0.3),
        },
      );
      summary = result.data;
      provider = result.provider;
      modelName = provider === 'gemini' ? 'gemini-2.5-flash' : provider === 'groq' ? 'allam-2-7b' : provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : provider === 'deepseek' ? 'deepseek-chat' : 'mistral-small-latest';
    } catch {
      throw new ServiceUnavailableException('AI search is unavailable: no AI provider is configured or reachable.');
    }

    const results = await this.ai.webSearch(options.query);

    return {
      success: true,
      data: { query: options.query, depth: options.depth || 'quick', summary, results, totalResults: results.length },
      model: modelName,
      provider,
      latency: Date.now() - start,
    };
  }
}
