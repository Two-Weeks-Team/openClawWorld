/**
 * DecisionParser - Parses LLM output into structured decisions
 *
 * Handles malformed JSON gracefully with fallback strategies.
 */

import type { AgentDecision, AgentAction } from '../types/agent.types.js';
import type { ReflectionResult } from '../types/memory.types.js';

export class DecisionParser {
  parseDecision(raw: string): AgentDecision {
    try {
      const json = extractJson(raw);
      const data = JSON.parse(json);

      return {
        action: this.parseAction(data.action),
        thought: typeof data.thought === 'string' ? data.thought : '',
        emotionDelta: this.parseEmotionDelta(data.emotionDelta),
        memoryNote: typeof data.memoryNote === 'string' ? data.memoryNote : undefined,
        importance: typeof data.importance === 'number' ? clamp(data.importance, 0, 10) : 3,
      };
    } catch {
      // Fallback: idle with the raw text as thought
      return {
        action: { type: 'idle' },
        thought: raw.slice(0, 200),
        emotionDelta: { valence: 0, arousal: 0, dominance: 0 },
        importance: 1,
      };
    }
  }

  parseReflection(raw: string): ReflectionResult {
    try {
      const json = extractJson(raw);
      const data = JSON.parse(json);

      return {
        insights: Array.isArray(data.insights)
          ? data.insights.filter((i: unknown) => typeof i === 'string')
          : [],
        updatedBeliefs: Array.isArray(data.updatedBeliefs) ? data.updatedBeliefs : [],
        relationshipUpdates: Array.isArray(data.relationshipUpdates)
          ? data.relationshipUpdates
          : [],
        newGoal: typeof data.newGoal === 'string' ? data.newGoal : undefined,
        emotionAdjustment: data.emotionAdjustment ?? undefined,
      };
    } catch {
      return {
        insights: [],
        updatedBeliefs: [],
        relationshipUpdates: [],
      };
    }
  }

  private parseAction(data: unknown): AgentAction {
    if (!data || typeof data !== 'object') return { type: 'idle' };

    const action = data as Record<string, unknown>;
    const type = action['type'];

    switch (type) {
      case 'moveTo': {
        const dest = action['dest'] as { tx?: number; ty?: number } | undefined;
        if (!dest || typeof dest.tx !== 'number' || typeof dest.ty !== 'number') {
          return { type: 'idle' };
        }
        return {
          type: 'moveTo',
          dest: { tx: Math.round(dest.tx), ty: Math.round(dest.ty) },
          reason: typeof action['reason'] === 'string' ? action['reason'] : 'moving',
        };
      }

      case 'chat': {
        const channel = action['channel'];
        const message = action['message'];
        if (typeof message !== 'string' || !message.trim()) return { type: 'idle' };
        return {
          type: 'chat',
          channel: channel === 'global' ? 'global' : 'proximity',
          message: message.slice(0, 500),
          targetName: typeof action['targetName'] === 'string' ? action['targetName'] : undefined,
        };
      }

      case 'interact': {
        const targetId = action['targetId'];
        const actionName = action['action'];
        if (typeof targetId !== 'string' || typeof actionName !== 'string') return { type: 'idle' };
        return {
          type: 'interact',
          targetId,
          action: actionName,
          params:
            typeof action['params'] === 'object'
              ? (action['params'] as Record<string, unknown>)
              : undefined,
        };
      }

      case 'reflect':
        return { type: 'reflect' };

      case 'observe':
        return {
          type: 'observe',
          reason: typeof action['reason'] === 'string' ? action['reason'] : 'looking around',
        };

      case 'idle':
      default:
        return { type: 'idle' };
    }
  }

  private parseEmotionDelta(data: unknown): {
    valence: number;
    arousal: number;
    dominance: number;
  } {
    if (!data || typeof data !== 'object') return { valence: 0, arousal: 0, dominance: 0 };

    const d = data as Record<string, unknown>;
    return {
      valence: typeof d['valence'] === 'number' ? clamp(d['valence'], -0.3, 0.3) : 0,
      arousal: typeof d['arousal'] === 'number' ? clamp(d['arousal'], -0.2, 0.2) : 0,
      dominance: typeof d['dominance'] === 'number' ? clamp(d['dominance'], -0.2, 0.2) : 0,
    };
  }
}

/** Extract JSON from text that might have markdown code fences */
function extractJson(text: string): string {
  // Try to find JSON in code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) return fenceMatch[1]!.trim();

  // Try to find first { ... } block
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }

  return text;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
