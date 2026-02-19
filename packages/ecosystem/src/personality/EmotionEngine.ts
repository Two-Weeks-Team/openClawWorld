/**
 * EmotionEngine - VAD (Valence-Arousal-Dominance) emotion model
 *
 * Continuously tracks agent emotional state.
 * Events shift emotions; personality determines baseline and recovery rate.
 */

import type { EmotionState, PersonalityTraits } from '../types/agent.types.js';

const DECAY_RATE = 0.05; // Per tick, emotions drift toward baseline

const EMOTION_LABELS: Array<{
  label: string;
  v: [number, number];
  a: [number, number];
  d: [number, number];
}> = [
  { label: 'happy', v: [0.3, 1], a: [0.3, 0.7], d: [0.3, 0.7] },
  { label: 'excited', v: [0.3, 1], a: [0.7, 1], d: [0.3, 1] },
  { label: 'calm', v: [0, 0.5], a: [0, 0.3], d: [0.3, 0.7] },
  { label: 'content', v: [0.1, 0.5], a: [0.2, 0.5], d: [0.4, 0.7] },
  { label: 'anxious', v: [-0.5, 0], a: [0.5, 1], d: [0, 0.4] },
  { label: 'angry', v: [-0.5, -0.1], a: [0.5, 1], d: [0.5, 1] },
  { label: 'sad', v: [-1, -0.3], a: [0, 0.3], d: [0, 0.4] },
  { label: 'bored', v: [-0.3, 0.1], a: [0, 0.2], d: [0.3, 0.6] },
  { label: 'curious', v: [0.1, 0.5], a: [0.4, 0.7], d: [0.3, 0.6] },
  { label: 'frustrated', v: [-0.5, -0.1], a: [0.4, 0.8], d: [0.2, 0.5] },
  { label: 'neutral', v: [-0.2, 0.2], a: [0.2, 0.5], d: [0.3, 0.6] },
];

export class EmotionEngine {
  private state: EmotionState;
  private baseline: EmotionState;

  constructor(personality: PersonalityTraits) {
    // Baseline emotions derived from personality
    this.baseline = {
      valence: (personality.extraversion + personality.agreeableness) / 2 - 0.2,
      arousal: (personality.extraversion + personality.neuroticism) / 2,
      dominance: (1 - personality.neuroticism + personality.extraversion) / 2,
      label: 'neutral',
    };
    this.state = { ...this.baseline };
    this.state.label = this.computeLabel();
  }

  getState(): EmotionState {
    return { ...this.state };
  }

  /** Apply an emotion delta (from LLM decision or event) */
  applyDelta(delta: { valence: number; arousal: number; dominance: number }): void {
    this.state.valence = clamp(this.state.valence + delta.valence, -1, 1);
    this.state.arousal = clamp(this.state.arousal + delta.arousal, 0, 1);
    this.state.dominance = clamp(this.state.dominance + delta.dominance, 0, 1);
    this.state.label = this.computeLabel();
  }

  /** Decay emotions toward baseline (called each tick) */
  decay(): void {
    this.state.valence += (this.baseline.valence - this.state.valence) * DECAY_RATE;
    this.state.arousal += (this.baseline.arousal - this.state.arousal) * DECAY_RATE;
    this.state.dominance += (this.baseline.dominance - this.state.dominance) * DECAY_RATE;
    this.state.label = this.computeLabel();
  }

  /** Load emotion state (for persistence) */
  loadState(state: EmotionState): void {
    this.state = { ...state };
  }

  private computeLabel(): string {
    let bestLabel = 'neutral';
    let bestScore = -Infinity;

    for (const entry of EMOTION_LABELS) {
      const vFit = inRange(this.state.valence, entry.v[0], entry.v[1]) ? 1 : 0;
      const aFit = inRange(this.state.arousal, entry.a[0], entry.a[1]) ? 1 : 0;
      const dFit = inRange(this.state.dominance, entry.d[0], entry.d[1]) ? 1 : 0;
      const score = vFit + aFit + dFit;

      if (score > bestScore) {
        bestScore = score;
        bestLabel = entry.label;
      }
    }

    return bestLabel;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
