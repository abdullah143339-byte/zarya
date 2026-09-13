import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface FallbackProvider {
  name: string;
  key: string;
  check: () => boolean;
}

@Injectable()
export class ProviderFallbackService {
  private readonly logger = new Logger(ProviderFallbackService.name);
  private exhaustedProviders: Set<string> = new Set();
  private resetTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: ConfigService) {}

  getChatProviders(): FallbackProvider[] {
    return [
      { name: 'gemini', key: 'GEMINI_API_KEY', check: () => !!this.config.get('GEMINI_API_KEY') },
      { name: 'groq', key: 'GROQ_API_KEY', check: () => !!this.config.get('GROQ_API_KEY') },
      { name: 'openrouter', key: 'OPENROUTER_API_KEY', check: () => !!this.config.get('OPENROUTER_API_KEY') },
      { name: 'mistral', key: 'MISTRAL_API_KEY', check: () => !!this.config.get('MISTRAL_API_KEY') },
      { name: 'deepseek', key: 'DEEPSEEK_API_KEY', check: () => !!this.config.get('DEEPSEEK_API_KEY') },
    ];
  }

  getCodeProviders(): FallbackProvider[] {
    return [
      { name: 'gemini', key: 'GEMINI_API_KEY', check: () => !!this.config.get('GEMINI_API_KEY') },
      { name: 'groq', key: 'GROQ_API_KEY', check: () => !!this.config.get('GROQ_API_KEY') },
      { name: 'openrouter', key: 'OPENROUTER_API_KEY', check: () => !!this.config.get('OPENROUTER_API_KEY') },
      { name: 'mistral', key: 'MISTRAL_API_KEY', check: () => !!this.config.get('MISTRAL_API_KEY') },
      { name: 'deepseek', key: 'DEEPSEEK_API_KEY', check: () => !!this.config.get('DEEPSEEK_API_KEY') },
    ];
  }

  getTranslationProviders(): FallbackProvider[] {
    return [
      { name: 'gemini', key: 'GEMINI_API_KEY', check: () => !!this.config.get('GEMINI_API_KEY') },
      { name: 'groq', key: 'GROQ_API_KEY', check: () => !!this.config.get('GROQ_API_KEY') },
      { name: 'openrouter', key: 'OPENROUTER_API_KEY', check: () => !!this.config.get('OPENROUTER_API_KEY') },
      { name: 'mistral', key: 'MISTRAL_API_KEY', check: () => !!this.config.get('MISTRAL_API_KEY') },
      { name: 'deepseek', key: 'DEEPSEEK_API_KEY', check: () => !!this.config.get('DEEPSEEK_API_KEY') },
    ];
  }

  getSearchProviders(): FallbackProvider[] {
    return [
      { name: 'gemini', key: 'GEMINI_API_KEY', check: () => !!this.config.get('GEMINI_API_KEY') },
      { name: 'groq', key: 'GROQ_API_KEY', check: () => !!this.config.get('GROQ_API_KEY') },
      { name: 'openrouter', key: 'OPENROUTER_API_KEY', check: () => !!this.config.get('OPENROUTER_API_KEY') },
      { name: 'mistral', key: 'MISTRAL_API_KEY', check: () => !!this.config.get('MISTRAL_API_KEY') },
      { name: 'deepseek', key: 'DEEPSEEK_API_KEY', check: () => !!this.config.get('DEEPSEEK_API_KEY') },
    ];
  }

  getImageProviders(): FallbackProvider[] {
    return [
      { name: 'fal', key: 'FAL_API_KEY', check: () => !!this.config.get('FAL_API_KEY') },
      { name: 'stability', key: 'STABILITY_API_KEY', check: () => !!this.config.get('STABILITY_API_KEY') },
      { name: 'pollinations', key: '', check: () => true },
    ];
  }

  async tryProviders<T>(
    providers: FallbackProvider[],
    callbacks: Record<string, () => Promise<T>>,
    options?: { retries?: number; retryDelayMs?: number },
  ): Promise<{ data: T; provider: string }> {
    const retries = options?.retries ?? 2;
    const baseDelay = options?.retryDelayMs ?? 800;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`All providers failed on attempt ${attempt}/${retries}; retrying in ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      try {
        return await this.tryOnce(providers, callbacks);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  private async tryOnce<T>(providers: FallbackProvider[], callbacks: Record<string, () => Promise<T>>): Promise<{ data: T; provider: string }> {
    for (const provider of providers) {
      if (this.exhaustedProviders.has(provider.name)) {
        this.logger.debug(`Skipping exhausted provider: ${provider.name}`);
        continue;
      }
      if (!provider.check()) {
        this.logger.debug(`Provider ${provider.name} not configured, skipping`);
        continue;
      }

      const callback = callbacks[provider.name];
      if (!callback) continue;

      try {
        this.logger.log(`Trying provider: ${provider.name}`);
        const data = await callback();
        return { data, provider: provider.name };
      } catch (err: any) {
        const status = err?.response?.status || err?.status || 0;
        const isRateLimit = status === 429 || status === 503 || (err.message && (err.message.includes('rate limit') || err.message.includes('quota') || err.message.includes('429') || err.message.includes('exhausted')));
        const isAuthError = status === 401 || status === 403;
        const isInsufficientBalance = status === 402 || (err.message && err.message.toLowerCase().includes('insufficient balance'));

        if (isInsufficientBalance) {
          this.logger.warn(`Provider ${provider.name} insufficient balance, exhausting for 1h`);
          this.exhaustProvider(provider.name, 3600000);
        } else if (isRateLimit) {
          this.logger.warn(`Provider ${provider.name} rate limited, exhausting for 60s`);
          this.exhaustProvider(provider.name, 60000);
        } else if (isAuthError) {
          this.logger.warn(`Provider ${provider.name} auth error, exhausting permanently`);
          this.exhaustProvider(provider.name, 0);
        } else {
          this.logger.warn(`Provider ${provider.name} failed: ${err.message}`);
        }
      }
    }

    throw new Error('All AI providers exhausted. No provider available.');
  }

  private exhaustProvider(name: string, durationMs: number) {
    this.exhaustedProviders.add(name);
    if (durationMs > 0 && !this.resetTimers.has(name)) {
      const timer = setTimeout(() => {
        this.exhaustedProviders.delete(name);
        this.resetTimers.delete(name);
        this.logger.log(`Provider ${name} reset after rate limit cooldown`);
      }, durationMs);
      this.resetTimers.set(name, timer);
    }
  }

  getExhaustedProviders(): string[] {
    return Array.from(this.exhaustedProviders);
  }

  resetAll() {
    this.exhaustedProviders.clear();
    this.resetTimers.forEach(t => clearTimeout(t));
    this.resetTimers.clear();
  }
}
