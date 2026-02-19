/**
 * PersonalitySystem - Integrates Big Five traits, emotions, and needs
 *
 * Central personality hub that influences all agent behavior.
 */

import type {
  AgentConfig,
  PersonalityTraits,
  EmotionState,
  NeedsState,
} from '../types/agent.types.js';
import { EmotionEngine } from './EmotionEngine.js';
import { NeedsSystem } from './NeedsSystem.js';

export class PersonalitySystem {
  readonly traits: PersonalityTraits;
  readonly emotion: EmotionEngine;
  readonly needs: NeedsSystem;
  constructor(config: AgentConfig, dataDir: string) {
    this.traits = config.personality;
    this.emotion = new EmotionEngine(config.personality);
    this.needs = new NeedsSystem(`${dataDir}/personality-state.json`);
  }

  /** Tick: decay emotions and needs */
  tick(): void {
    this.emotion.decay();
    this.needs.decay();
  }

  getEmotionState(): EmotionState {
    return this.emotion.getState();
  }

  getNeedsState(): NeedsState {
    return this.needs.getState();
  }

  /** How likely this agent is to initiate conversation (0-1) */
  getChatProbability(): number {
    const base = this.traits.extraversion * 0.6 + this.traits.agreeableness * 0.3;
    const emotionBoost = (this.emotion.getState().valence + 1) / 4; // 0 to 0.5
    const needBoost = (1 - this.needs.getState().belonging) * 0.3;
    return Math.min(1, base + emotionBoost + needBoost);
  }

  /** How likely this agent is to explore (0-1) */
  getExploreProbability(): number {
    const base = this.traits.openness * 0.6;
    const arousalBoost = this.emotion.getState().arousal * 0.2;
    const needBoost = (1 - this.needs.getState().selfActualization) * 0.2;
    return Math.min(1, base + arousalBoost + needBoost);
  }

  /** How likely this agent is to stay put (0-1) */
  getStayProbability(): number {
    const base = this.traits.conscientiousness * 0.4;
    const safetyNeed = (1 - this.needs.getState().safety) * 0.3;
    const lowArousal = (1 - this.emotion.getState().arousal) * 0.3;
    return Math.min(1, base + safetyNeed + lowArousal);
  }

  /** Personality summary for LLM prompt */
  getPersonalitySummary(): string {
    const t = this.traits;
    const emotion = this.emotion.getState();
    const needs = this.needs.getState();
    const urgent = this.needs.getMostUrgentNeed();

    return [
      `Personality: O:${t.openness.toFixed(1)} C:${t.conscientiousness.toFixed(1)} E:${t.extraversion.toFixed(1)} A:${t.agreeableness.toFixed(1)} N:${t.neuroticism.toFixed(1)}`,
      `Emotion: ${emotion.label} (V:${emotion.valence.toFixed(2)} A:${emotion.arousal.toFixed(2)} D:${emotion.dominance.toFixed(2)})`,
      `Most urgent need: ${urgent.need} (${urgent.value.toFixed(2)})`,
      `Needs: phys=${needs.physiological.toFixed(2)} safe=${needs.safety.toFixed(2)} belong=${needs.belonging.toFixed(2)} esteem=${needs.esteem.toFixed(2)} self=${needs.selfActualization.toFixed(2)}`,
    ].join('\n');
  }

  save(): void {
    this.needs.save();
  }
}
