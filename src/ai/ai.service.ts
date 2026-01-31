import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  GeneratePostDto,
  ImprovePostDto,
  PostTone,
} from './dto/generate-post.dto';

@Injectable()
export class AiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private readonly logger = new Logger(AiService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async generatePost(dto: GeneratePostDto): Promise<{ content: string }> {
    const { prompt, tone = PostTone.PROFESSIONAL, keywords } = dto;

    const systemPrompt = this.buildSystemPrompt(tone);
    const userPrompt = this.buildUserPrompt(prompt, keywords);

    const fullPrompt = `${systemPrompt}\n\nUser Request: ${userPrompt}`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const content = result.response.text();
      return { content };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Gemini generation failed: ${message}`);
      throw new Error('Failed to generate post with Gemini AI');
    }
  }

  async improvePost(dto: ImprovePostDto): Promise<{ content: string }> {
    const { content, improvements } = dto;

    const systemPrompt = `You are an expert LinkedIn content strategist. Your task is to improve LinkedIn posts to make them more engaging, professional, and effective.`;

    const userPrompt = improvements
      ? `Improve this LinkedIn post with focus on: ${improvements}\n\nOriginal post:\n${content}`
      : `Improve this LinkedIn post to make it more engaging and professional:\n\n${content}`;

    const fullPrompt = `${systemPrompt}\n\nInstruction: ${userPrompt}`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const improvedContent = result.response.text();
      return { content: improvedContent };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Gemini improvement failed: ${message}`);
      throw new Error('Failed to improve post with Gemini AI');
    }
  }

  private buildSystemPrompt(tone: PostTone): string {
    const toneDescriptions: Record<PostTone, string> = {
      [PostTone.PROFESSIONAL]:
        'professional, authoritative, and business-focused',
      [PostTone.CASUAL]: 'friendly, conversational, and approachable',
      [PostTone.INSPIRATIONAL]:
        'motivational, uplifting, and thought-provoking',
      [PostTone.EDUCATIONAL]: 'informative, clear, and value-driven',
    };

    return `You are an expert LinkedIn content creator. Generate engaging LinkedIn posts that are ${toneDescriptions[tone]}. 
    
Guidelines:
- Keep posts between 150-300 words
- Use short paragraphs for readability
- Include relevant emojis sparingly
- End with a call-to-action or question
- Make it authentic and valuable
- Avoid excessive hashtags (max 3-5)`;
  }

  private buildUserPrompt(prompt: string, keywords?: string): string {
    let userPrompt = `Create a LinkedIn post about: ${prompt}`;

    if (keywords) {
      userPrompt += `\n\nInclude these keywords naturally: ${keywords}`;
    }

    return userPrompt;
  }
}
