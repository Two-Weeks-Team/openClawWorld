/**
 * SocialPerception - Forms and updates impressions of other entities
 */

import type { SocialPerceptionEntry } from '../types/social.types.js';

export class SocialPerception {
  private perceptions: Map<string, SocialPerceptionEntry> = new Map();

  getPerception(entityId: string): SocialPerceptionEntry | undefined {
    return this.perceptions.get(entityId);
  }

  updatePerception(
    entityId: string,
    entityName: string,
    impression: string,
    traits?: string[],
    mood?: string
  ): void {
    const existing = this.perceptions.get(entityId);

    if (!existing) {
      this.perceptions.set(entityId, {
        entityId,
        entityName,
        firstImpression: impression,
        currentImpression: impression,
        perceivedTraits: traits ?? [],
        perceivedMood: mood ?? 'unknown',
        lastUpdated: Date.now(),
      });
    } else {
      existing.currentImpression = impression;
      if (traits) existing.perceivedTraits = traits;
      if (mood) existing.perceivedMood = mood;
      existing.lastUpdated = Date.now();
    }
  }

  getPerceptionSummary(entityId: string): string | null {
    const p = this.perceptions.get(entityId);
    if (!p) return null;

    return `${p.entityName}: "${p.currentImpression}" (traits: ${p.perceivedTraits.join(', ') || 'unknown'}, mood: ${p.perceivedMood})`;
  }
}
