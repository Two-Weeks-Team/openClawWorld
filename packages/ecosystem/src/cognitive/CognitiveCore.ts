/**
 * CognitiveCore - Claude API reasoning engine
 *
 * Manages LLM calls with token tracking and error handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { EcosystemConfig } from '../config/ecosystem.config.js';
import type { AgentDecision, TickContext } from '../types/agent.types.js';
import type { ReflectionResult } from '../types/memory.types.js';
import { PromptBuilder } from './PromptBuilder.js';
import { DecisionParser } from './DecisionParser.js';
import type { AgentConfig } from '../types/agent.types.js';

export type CognitiveStats = {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  skippedTicks: number;
  errors: number;
};

export class CognitiveCore {
  private readonly client: Anthropic;
  private readonly promptBuilder: PromptBuilder;
  private readonly parser: DecisionParser;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly systemPrompt: string;
  private stats: CognitiveStats = {
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    skippedTicks: 0,
    errors: 0,
  };

  constructor(config: EcosystemConfig, agentConfig: AgentConfig) {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    this.promptBuilder = new PromptBuilder(agentConfig);
    this.parser = new DecisionParser();
    this.model = config.model;
    this.maxTokens = config.maxTokensPerCall;
    this.systemPrompt = this.promptBuilder.buildSystemPrompt();
  }

  async decide(ctx: TickContext): Promise<AgentDecision> {
    const userPrompt = this.promptBuilder.buildTickPrompt(ctx);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      this.stats.totalCalls++;
      this.stats.totalInputTokens += response.usage.input_tokens;
      this.stats.totalOutputTokens += response.usage.output_tokens;

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      return this.parser.parseDecision(text);
    } catch (error) {
      this.stats.errors++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CognitiveCore] LLM call failed: ${message}`);

      return {
        action: { type: 'idle' },
        thought: `Error thinking: ${message}`,
        emotionDelta: { valence: -0.1, arousal: 0.1, dominance: -0.05 },
        importance: 2,
      };
    }
  }

  async reflect(recentEpisodes: string[], currentBeliefs: string[]): Promise<ReflectionResult> {
    const userPrompt = this.promptBuilder.buildReflectionPrompt(recentEpisodes, currentBeliefs);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: this.systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      this.stats.totalCalls++;
      this.stats.totalInputTokens += response.usage.input_tokens;
      this.stats.totalOutputTokens += response.usage.output_tokens;

      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      return this.parser.parseReflection(text);
    } catch (error) {
      this.stats.errors++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CognitiveCore] Reflection failed: ${message}`);
      return { insights: [], updatedBeliefs: [], relationshipUpdates: [] };
    }
  }

  getStats(): CognitiveStats {
    return { ...this.stats };
  }

  incrementSkipped(): void {
    this.stats.skippedTicks++;
  }
}
