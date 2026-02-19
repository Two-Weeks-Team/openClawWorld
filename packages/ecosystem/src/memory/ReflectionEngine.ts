/**
 * ReflectionEngine - Periodic introspection and generalization
 *
 * Triggered every N ticks or on high-importance events.
 * Generates semantic insights from episodic memories.
 */

import type { EpisodicMemory } from './EpisodicMemory.js';
import type { SemanticMemory } from './SemanticMemory.js';
import type { ReflectionResult } from '../types/memory.types.js';

export class ReflectionEngine {
  private ticksSinceReflection = 0;
  private readonly interval: number;

  constructor(
    private readonly episodic: EpisodicMemory,
    private readonly semantic: SemanticMemory,
    interval = 12
  ) {
    this.interval = interval;
  }

  tick(): void {
    this.ticksSinceReflection++;
  }

  shouldReflect(highImportanceEvent = false): boolean {
    if (highImportanceEvent) return true;
    return this.ticksSinceReflection >= this.interval;
  }

  /**
   * Process reflection results from LLM (the LLM does the actual thinking).
   * This method applies the structured results to memory.
   */
  applyReflection(result: ReflectionResult): void {
    this.ticksSinceReflection = 0;

    // Store new beliefs/insights in semantic memory
    for (const belief of result.updatedBeliefs) {
      const existing = this.semantic.getBySubject(belief.subject);
      if (existing.length > 0) {
        this.semantic.update(existing[0]!.id, {
          content: belief.content,
          confidence: belief.confidence,
          sources: belief.sources,
        });
      } else {
        this.semantic.add({
          category: belief.category,
          subject: belief.subject,
          content: belief.content,
          confidence: belief.confidence,
          sources: belief.sources,
        });
      }
    }
  }

  getRecentEpisodesForReflection(count = 15): string[] {
    return this.episodic
      .getRecent(count)
      .map(r => `[${new Date(r.timestamp).toISOString()}] (${r.type}) ${r.content}`);
  }
}
