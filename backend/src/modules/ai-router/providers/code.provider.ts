import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiIntegrationService } from '../../../common/services/ai-integration.service';
import { ProviderFallbackService } from '../../../common/services/provider-fallback.service';
import { AIProviderResponse, AICodeOptions } from './ai-provider.interface';

@Injectable()
export class CodeProvider {
  constructor(
    private ai: AiIntegrationService,
    private fallback: ProviderFallbackService,
  ) {}

  async generate(options: AICodeOptions): Promise<AIProviderResponse> {
    const start = Date.now();
    const lang = options.language || 'typescript';

    let data: string;
    let provider = '';
    try {
      const result = await this.fallback.tryProviders(
        this.fallback.getCodeProviders(),
        {
          groq: () => this.ai.groqCode(options.prompt, lang),
          gemini: () => this.ai.geminiGenerate(`Generate ${lang} code for: ${options.prompt}. Task: ${options.task}. Only output the code with brief explanation.`, 'gemini-2.5-flash'),
          openrouter: () => this.ai.openRouterCode(options.prompt, lang),
          deepseek: () => this.ai.deepSeekCode(options.prompt, lang),
          mistral: () => this.ai.mistralCode(options.prompt, lang),
        },
      );
      data = result.data;
      provider = result.provider;
    } catch {
      throw new ServiceUnavailableException('AI code generation is unavailable: no AI provider is configured or reachable.');
    }

    let modelName = '';
    switch (provider) {
      case 'groq': modelName = 'allam-2-7b'; break;
      case 'gemini': modelName = 'gemini-2.5-flash'; break;
      case 'openrouter': modelName = 'meta-llama/llama-3.3-70b-instruct'; break;
      case 'deepseek': modelName = 'deepseek-chat'; break;
      case 'mistral': modelName = 'codestral-latest'; break;
    }

    return {
      success: true,
      data: { content: data, language: lang, task: options.task },
      model: modelName,
      provider,
      latency: Date.now() - start,
    };
  }
}
