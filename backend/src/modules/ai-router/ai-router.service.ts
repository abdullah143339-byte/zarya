import { Injectable, Logger } from '@nestjs/common';
import { ChatProvider } from './providers/chat.provider';
import { ImageProvider } from './providers/image.provider';
import { CodeProvider } from './providers/code.provider';
import { TranslationProvider } from './providers/translation.provider';
import { SearchProvider } from './providers/search.provider';
import { ProviderFallbackService } from '../../common/services/provider-fallback.service';
import {
  AIProviderResponse,
  AIChatOptions,
  AIImageOptions,
  AICodeOptions,
  AITranslationOptions,
  AISearchOptions,
  AIChatMessage,
} from './providers/ai-provider.interface';

@Injectable()
export class AiRouterService {
  private readonly logger = new Logger(AiRouterService.name);

  private readonly providerCatalog: Record<string, { model: string; capabilities: string[] }> = {
    groq: { model: 'allam-2-7b', capabilities: ['text-generation', 'qa', 'analysis', 'code'] },
    gemini: { model: 'gemini-2.5-flash', capabilities: ['text-generation', 'translation', 'language-detection', 'deep-search'] },
    openrouter: { model: 'meta-llama/llama-3.3-70b-instruct', capabilities: ['text-generation', 'code'] },
    deepseek: { model: 'deepseek-chat', capabilities: ['text-generation', 'code'] },
    mistral: { model: 'mistral-small-latest', capabilities: ['text-generation', 'translation', 'code'] },
    fal: { model: 'fal-ai/flux/dev', capabilities: ['image-generation'] },
    stability: { model: 'sd3-large', capabilities: ['image-generation'] },
    pollinations: { model: 'pollinations-flux', capabilities: ['image-generation'] },
  };

  constructor(
    private chatProvider: ChatProvider,
    private imageProvider: ImageProvider,
    private codeProvider: CodeProvider,
    private translationProvider: TranslationProvider,
    private searchProvider: SearchProvider,
    private fallback: ProviderFallbackService,
  ) {}

  async routeToChat(messages: AIChatMessage[], options?: Partial<AIChatOptions>): Promise<AIProviderResponse> {
    this.logger.log(`Routing chat request with ${messages.length} messages`);
    return this.chatProvider.generate({
      messages,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 2048,
      stream: options?.stream ?? false,
    });
  }

  async routeToImage(options: AIImageOptions): Promise<AIProviderResponse> {
    this.logger.log(`Routing image generation: "${options.prompt.slice(0, 50)}..."`);
    return this.imageProvider.generate(options);
  }

  async routeToCode(options: AICodeOptions): Promise<AIProviderResponse> {
    this.logger.log(`Routing code ${options.task}: "${options.prompt.slice(0, 50)}..."`);
    return this.codeProvider.generate(options);
  }

  async routeToTranslation(options: AITranslationOptions): Promise<AIProviderResponse> {
    this.logger.log(`Routing translation: ${options.sourceLanguage || 'auto'} → ${options.targetLanguage}`);
    return this.translationProvider.translate(options);
  }

  async detectLanguage(text: string): Promise<AIProviderResponse> {
    this.logger.log(`Detecting language for text`);
    return this.translationProvider.detectLanguage(text);
  }

  async getSupportedLanguages(): Promise<AIProviderResponse> {
    return this.translationProvider.getSupportedLanguages();
  }

  async routeToSearch(options: AISearchOptions): Promise<AIProviderResponse> {
    this.logger.log(`Routing deep search: "${options.query}" (${options.depth || 'quick'} depth)`);
    return this.searchProvider.deepSearch(options);
  }

  async getRouterInfo(): Promise<AIProviderResponse> {
    const configured = new Set<string>();
    for (const providers of [
      this.fallback.getChatProviders(),
      this.fallback.getCodeProviders(),
      this.fallback.getImageProviders(),
      this.fallback.getTranslationProviders(),
      this.fallback.getSearchProviders(),
    ]) {
      for (const p of providers) {
        if (p.check()) configured.add(p.name);
      }
    }

    const providers = [...configured].map((name) => {
      const info = this.providerCatalog[name] || { model: name, capabilities: [] };
      return { id: name, name, model: info.model, capabilities: info.capabilities };
    });

    return {
      success: true,
      data: {
        providers,
        configuredCount: providers.length,
        routingStrategy: 'provider-fallback',
        autoScaling: false,
        fallbackEnabled: true,
      },
      model: 'provider-fallback',
      provider: 'ai-router',
    };
  }
}
