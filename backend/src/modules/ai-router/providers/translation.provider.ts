import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiIntegrationService } from '../../../common/services/ai-integration.service';
import { ProviderFallbackService } from '../../../common/services/provider-fallback.service';
import { AIProviderResponse, AITranslationOptions } from './ai-provider.interface';

@Injectable()
export class TranslationProvider {
  constructor(
    private ai: AiIntegrationService,
    private fallback: ProviderFallbackService,
  ) {}

  async translate(options: AITranslationOptions): Promise<AIProviderResponse> {
    const start = Date.now();
    const langName = this.getLangName(options.targetLanguage);

    let translatedText: string;
    let provider = '';
    try {
      const result = await this.fallback.tryProviders(
        this.fallback.getTranslationProviders(),
        {
          gemini: () => this.ai.geminiTranslate(options.text, langName),
          groq: () => this.ai.groqChat([
            { role: 'system', content: `You are a translator. Translate to ${langName}. Return ONLY the translation.` },
            { role: 'user', content: options.text },
          ], 'allam-2-7b', 0.3),
          openrouter: () => this.ai.openRouterChat([
            { role: 'system', content: `You are a translator. Translate to ${langName}. Return ONLY the translation.` },
            { role: 'user', content: options.text },
          ], 'meta-llama/llama-3.3-70b-instruct', 0.3),
          deepseek: () => this.ai.deepSeekChat([
            { role: 'system', content: `You are a translator. Translate to ${langName}. Return ONLY the translation.` },
            { role: 'user', content: options.text },
          ], 'deepseek-chat', 0.3),
          mistral: () => this.ai.mistralTranslate(options.text, langName),
        },
      );
      translatedText = result.data;
      provider = result.provider;
    } catch {
      throw new ServiceUnavailableException('AI translation is unavailable: no AI provider is configured or reachable.');
    }

    let detectedLang = '';
    try {
      const { data: lang } = await this.fallback.tryProviders(
        this.fallback.getTranslationProviders(),
        {
          gemini: () => this.ai.geminiDetectLanguage(options.text),
          groq: () => this.ai.groqChat([
            { role: 'system', content: 'Detect the language. Return ONLY the language name (e.g., "English").' },
            { role: 'user', content: options.text },
          ], 'allam-2-7b', 0.3),
          openrouter: () => this.ai.openRouterChat([
            { role: 'system', content: 'Detect the language. Return ONLY the language name (e.g., "English").' },
            { role: 'user', content: options.text },
          ], 'meta-llama/llama-3.3-70b-instruct', 0.3),
          deepseek: () => this.ai.deepSeekChat([
            { role: 'system', content: 'Detect the language. Return ONLY the language name (e.g., "English").' },
            { role: 'user', content: options.text },
          ], 'deepseek-chat', 0.3),
          mistral: () => this.ai.mistralChat([
            { role: 'system', content: 'Detect the language. Return ONLY the language name (e.g., "English").' },
            { role: 'user', content: options.text },
          ], 'mistral-small-latest', 0.3),
        },
      );
      detectedLang = lang;
    } catch {
      detectedLang = 'Unknown';
    }

    let modelName = '';
    switch (provider) {
      case 'gemini': modelName = 'gemini-2.5-flash'; break;
      case 'groq': modelName = 'allam-2-7b'; break;
      case 'openrouter': modelName = 'meta-llama/llama-3.3-70b-instruct'; break;
      case 'deepseek': modelName = 'deepseek-chat'; break;
      case 'mistral': modelName = 'mistral-small-latest'; break;
    }

    return {
      success: true,
      data: { translatedText, sourceLanguage: detectedLang, targetLanguage: options.targetLanguage },
      model: modelName,
      provider,
      latency: Date.now() - start,
    };
  }

  async detectLanguage(text: string): Promise<AIProviderResponse> {
    const start = Date.now();
    try {
      const { data, provider } = await this.fallback.tryProviders(
        this.fallback.getTranslationProviders(),
        {
          gemini: () => this.ai.geminiDetectLanguage(text),
          groq: () => this.ai.groqChat([
            { role: 'system', content: 'Detect the language. Return ONLY the language name (e.g., "English").' },
            { role: 'user', content: text },
          ], 'allam-2-7b', 0.3),
          openrouter: () => this.ai.openRouterChat([
            { role: 'system', content: 'Detect the language. Return ONLY the language name (e.g., "English").' },
            { role: 'user', content: text },
          ], 'meta-llama/llama-3.3-70b-instruct', 0.3),
          deepseek: () => this.ai.deepSeekChat([
            { role: 'system', content: 'Detect the language. Return ONLY the language name (e.g., "English").' },
            { role: 'user', content: text },
          ], 'deepseek-chat', 0.3),
          mistral: () => this.ai.mistralChat([
            { role: 'system', content: 'Detect the language. Return ONLY the language name (e.g., "English").' },
            { role: 'user', content: text },
          ], 'mistral-small-latest', 0.3),
        },
      );

      let modelName = '';
      switch (provider) {
        case 'gemini': modelName = 'gemini-2.5-flash'; break;
        case 'groq': modelName = 'allam-2-7b'; break;
        case 'openrouter': modelName = 'meta-llama/llama-3.3-70b-instruct'; break;
        case 'deepseek': modelName = 'deepseek-chat'; break;
        case 'mistral': modelName = 'mistral-small-latest'; break;
      }

      return {
        success: true,
        data: { language: data },
        model: modelName,
        provider,
        latency: Date.now() - start,
      };
    } catch {
      throw new ServiceUnavailableException('Language detection is unavailable: no AI provider is configured or reachable.');
    }
  }

  async getSupportedLanguages(): Promise<AIProviderResponse> {
    const languages = [
      { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' }, { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' }, { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' }, { code: 'hi', name: 'Hindi' },
      { code: 'ur', name: 'Urdu' }, { code: 'tr', name: 'Turkish' },
      { code: 'nl', name: 'Dutch' }, { code: 'pl', name: 'Polish' },
      { code: 'sv', name: 'Swedish' }, { code: 'da', name: 'Danish' },
      { code: 'fi', name: 'Finnish' }, { code: 'bn', name: 'Bengali' },
    ];
    return {
      success: true,
      data: { languages, count: languages.length },
      model: '',
      provider: '',
    };
  }

  private getLangName(code: string): string {
    const map: Record<string, string> = {
      en: 'English', es: 'Spanish', fr: 'French', de: 'German',
      it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
      ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi',
      ur: 'Urdu', tr: 'Turkish', nl: 'Dutch', pl: 'Polish',
      sv: 'Swedish', da: 'Danish', fi: 'Finnish', bn: 'Bengali',
    };
    return map[code] || code;
  }
}
