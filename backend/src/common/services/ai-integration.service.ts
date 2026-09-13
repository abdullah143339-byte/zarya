import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as FormData from 'form-data';

@Injectable()
export class AiIntegrationService {
  private readonly logger = new Logger(AiIntegrationService.name);

  constructor(private config: ConfigService) {}

  // ===== GROQ (Free - chat, code, reasoning) =====
  // Get key: https://console.groq.com/keys
  async groqChat(messages: { role: string; content: string }[], model = 'allam-2-7b', temperature = 0.7) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (!key) throw new Error('Groq API key not configured');

    try {
      const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model, messages, temperature, max_tokens: 2048,
      }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } });
      return data.choices[0].message.content;
    } catch (err: any) {
      this.logger.error(`Groq API error: ${err.message}`);
      throw err;
    }
  }

  async groqCode(prompt: string, language: string) {
    return this.groqChat([
      { role: 'system', content: `You are an expert ${language} developer. Generate production-ready code. Only output the code with brief explanation.` },
      { role: 'user', content: prompt },
    ], 'allam-2-7b', 0.3);
  }

  // ===== GOOGLE GEMINI (Free - translation, analysis, general) =====
  // Get key: https://aistudio.google.com/apikey
  async geminiGenerate(prompt: string, model = 'gemini-2.5-flash') {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key) throw new Error('Gemini API key not configured');

    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { contents: [{ parts: [{ text: prompt }] }] },
      );
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    } catch (err: any) {
      this.logger.error(`Gemini API error: ${err.message}`);
      throw err;
    }
  }

  async geminiTranslate(text: string, targetLang: string) {
    return this.geminiGenerate(
      `Translate the following text to ${targetLang}. Only return the translation, nothing else:\n\n${text}`,
    );
  }

  async geminiDetectLanguage(text: string) {
    return this.geminiGenerate(
      `Detect the language of the following text. Return ONLY the language name (e.g., "English", "Spanish", "Urdu"), nothing else:\n\n${text}`,
    );
  }

  async geminiDeepSearch(query: string) {
    return this.geminiGenerate(
      `You are a research assistant. Provide a comprehensive, well-structured answer about:\n\n${query}\n\nInclude key points, examples, and practical applications. Format with markdown.`,
      'gemini-2.5-flash',
    );
  }

  async geminiAnalyze(text: string) {
    return this.geminiGenerate(
      `Analyze the following and provide key insights, strengths, weaknesses, and recommendations:\n\n${text}`,
    );
  }

  // ===== FLUX (Black Forest Labs - image gen via API) =====
  // Get key: https://docs.bfl.ml/
  async fluxImage(prompt: string): Promise<string> {
    const key = this.config.get<string>('BFL_API_KEY');
    if (!key) throw new Error('Flux API key not configured');

    const { data } = await axios.post('https://api.bfl.ml/v1/generate', {
      prompt, width: 1024, height: 1024, steps: 25, guidance: 7.5,
    }, { headers: { 'x-key': key, 'Content-Type': 'application/json' } });
    const id = data?.id;
    if (!id) throw new Error('Flux: no image ID returned');
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const { data: status } = await axios.get(`https://api.bfl.ml/v1/get_result?id=${id}`, {
        headers: { 'x-key': key },
      });
      if (status?.status?.toLowerCase() === 'ready') return status.result?.sample || '';
    }
    throw new Error('Flux: image generation timed out');
  }

  // ===== FAL AI (image gen - flux/dev) =====
  // Get key: https://fal.ai/dashboard
  async falImage(prompt: string): Promise<string> {
    const key = this.config.get<string>('FAL_API_KEY');
    if (!key) throw new Error('FAL API key not configured');

    const { data } = await axios.post('https://fal.run/fal-ai/flux/dev', {
      prompt, image_size: 'landscape_4_3',
    }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } });
    const url = data?.images?.[0]?.url || data?.output?.images?.[0]?.url;
    if (!url) throw new Error('FAL: no image URL returned');
    return url;
  }

  // ===== POLLINATIONS (free, no key needed - unlimited image gen) =====
  async pollinationsImage(prompt: string): Promise<string> {
    try {
      const { data } = await axios.get('https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt), {
        params: { width: 1024, height: 1024, model: 'flux' },
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      const base64 = Buffer.from(data as ArrayBuffer).toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (err: any) {
      this.logger.error(`Pollinations API error: ${err.message}`);
      throw err;
    }
  }

  // ===== STABILITY AI (image gen - SD3) =====
  // Get key: https://platform.stability.ai/account/keys
  async stabilityImage(prompt: string): Promise<string> {
    const key = this.config.get<string>('STABILITY_API_KEY');
    if (!key) throw new Error('Stability API key not configured');

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('mode', 'text-to-image');
    form.append('output_format', 'png');

    const { data } = await axios.post(
      'https://api.stability.ai/v2beta/stable-image/generate/sd3',
      form,
      { headers: { Authorization: `Bearer ${key}`, Accept: 'image/*', ...form.getHeaders() }, responseType: 'arraybuffer' },
    );
    const base64 = Buffer.from(data as ArrayBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  }

  // ===== OPENROUTER (Free tier - chat, code, reasoning) =====
  // Get key: https://openrouter.ai/keys
  // Free models: mistral-7b, phi-3-mini, gemma-7b, etc.
  async openRouterChat(messages: { role: string; content: string }[], model = 'meta-llama/llama-3.3-70b-instruct', temperature = 0.7) {
    const key = this.config.get<string>('OPENROUTER_API_KEY');
    if (!key) throw new Error('OpenRouter API key not configured');

    try {
      const { data } = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model, messages, temperature, max_tokens: 2048,
      }, {
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'FutureAI',
        },
      });
      return data.choices[0].message.content;
    } catch (err: any) {
      this.logger.error(`OpenRouter API error: ${err.message}`);
      throw err;
    }
  }

  async openRouterCode(prompt: string, language: string) {
    return this.openRouterChat([
      { role: 'system', content: `You are an expert ${language} developer. Generate production-ready code. Only output the code with brief explanation.` },
      { role: 'user', content: prompt },
    ], 'meta-llama/llama-3.3-70b-instruct', 0.3);
  }

  // ===== DEEPSEEK (Free $5 credits on signup, no CC needed) =====
  // Get key: https://platform.deepseek.com/api_keys
  async deepSeekChat(messages: { role: string; content: string }[], model = 'deepseek-chat', temperature = 0.7) {
    const key = this.config.get<string>('DEEPSEEK_API_KEY');
    if (!key) throw new Error('DeepSeek API key not configured');

    try {
      const { data } = await axios.post('https://api.deepseek.com/chat/completions', {
        model, messages, temperature, max_tokens: 2048,
      }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } });
      return data.choices[0].message.content;
    } catch (err: any) {
      this.logger.error(`DeepSeek API error: ${err.message}`);
      throw err;
    }
  }

  async deepSeekCode(prompt: string, language: string) {
    return this.deepSeekChat([
      { role: 'system', content: `You are an expert ${language} developer. Generate production-ready code. Only output the code with brief explanation.` },
      { role: 'user', content: prompt },
    ], 'deepseek-chat', 0.3);
  }

  // ===== MISTRAL AI (Free 500k tokens/day, no CC needed) =====
  // Get key: https://console.mistral.ai/api-keys/
  async mistralChat(messages: { role: string; content: string }[], model = 'mistral-small-latest', temperature = 0.7) {
    const key = this.config.get<string>('MISTRAL_API_KEY');
    if (!key) throw new Error('Mistral API key not configured');

    try {
      const { data } = await axios.post('https://api.mistral.ai/v1/chat/completions', {
        model, messages, temperature, max_tokens: 2048,
      }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } });
      return data.choices[0].message.content;
    } catch (err: any) {
      this.logger.error(`Mistral API error: ${err.message}`);
      throw err;
    }
  }

  async mistralCode(prompt: string, language: string) {
    return this.mistralChat([
      { role: 'system', content: `You are an expert ${language} developer. Generate production-ready code. Only output the code with brief explanation.` },
      { role: 'user', content: prompt },
    ], 'codestral-latest', 0.3);
  }

  async mistralTranslate(text: string, targetLang: string) {
    return this.mistralChat([
      { role: 'system', content: `You are a translator. Translate to ${targetLang}. Return ONLY the translation.` },
      { role: 'user', content: text },
    ], 'mistral-small-latest', 0.3);
  }

  // ===== FREE SEARCH (Google Programmable Search) =====
  // Get key: https://developers.google.com/custom-search/v1/introduction
  // Get CX: https://programmablesearchengine.google.com/
  async webSearch(query: string, num = 5) {
    const key = this.config.get<string>('GOOGLE_SEARCH_API_KEY');
    const cx = this.config.get<string>('GOOGLE_SEARCH_CX');
    if (!key || !cx) return [];

    try {
      const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: { key, cx, q: query, num },
      });
      return (data.items || []).map((item: any) => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link,
      }));
    } catch {
      return [];
    }
  }

}
