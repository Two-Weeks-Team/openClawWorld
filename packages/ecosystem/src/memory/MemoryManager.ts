/**
 * MemoryManager - 3-tier memory orchestration
 *
 * Coordinates working, episodic, and semantic memory layers.
 * Provides unified retrieval with scoring.
 */

import { WorkingMemory } from './WorkingMemory.js';
import { EpisodicMemory } from './EpisodicMemory.js';
import { SemanticMemory } from './SemanticMemory.js';
import type { EpisodicRecord } from '../types/memory.types.js';
import type { MemoryEntry } from '../types/agent.types.js';

export class MemoryManager {
  readonly working: WorkingMemory;
  readonly episodic: EpisodicMemory;
  readonly semantic: SemanticMemory;

  constructor(dataDir: string) {
    this.working = new WorkingMemory();
    this.episodic = new EpisodicMemory(`${dataDir}/episodic-memory.jsonl`);
    this.semantic = new SemanticMemory(`${dataDir}/semantic-memory.json`);
  }

  addEpisode(record: EpisodicRecord): void {
    this.episodic.add(record);
  }

  /** Retrieve top memories relevant to current context */
  retrieveRelevant(currentContext: string, participants: string[], limit = 5): MemoryEntry[] {
    // Get scored episodic memories
    const episodicResults = this.episodic.search({
      text: currentContext,
      participants: participants.length > 0 ? participants : undefined,
      limit,
    });

    // Get relevant semantic knowledge
    const semanticEntries = this.semantic.getBySubject(currentContext).slice(0, 3);

    const memories: MemoryEntry[] = [];

    for (const result of episodicResults) {
      memories.push({
        id: result.record.id,
        type: 'episodic',
        content: result.record.content,
        timestamp: result.record.timestamp,
        importance: result.record.importance,
        participants: result.record.participants,
        tags: result.record.tags,
        score: result.score,
      });
    }

    for (const entry of semanticEntries) {
      memories.push({
        id: entry.id,
        type: 'semantic',
        content: `[${entry.category}] ${entry.subject}: ${entry.content}`,
        timestamp: entry.updatedAt,
        importance: Math.round(entry.confidence * 10),
        tags: [entry.category],
        score: entry.confidence,
      });
    }

    // Sort by score and return top N
    memories.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return memories.slice(0, limit);
  }

  getStats(): { episodicCount: number; semanticCount: number } {
    return {
      episodicCount: this.episodic.size(),
      semanticCount: this.semantic.size(),
    };
  }
}
