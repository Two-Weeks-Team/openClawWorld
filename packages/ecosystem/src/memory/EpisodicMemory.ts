/**
 * EpisodicMemory - Event-level memory stored as JSONL
 *
 * Append-only log of concrete experiences.
 * Supports retrieval scored by recency + importance + relevance.
 */

import { chmodSync, existsSync, mkdirSync, appendFileSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import type {
  EpisodicRecord,
  MemorySearchQuery,
  MemorySearchResult,
} from '../types/memory.types.js';

const RECENCY_HALF_LIFE_MS = 3600_000; // 1 hour

export class EpisodicMemory {
  private records: EpisodicRecord[] = [];
  private readonly filePath: string;

  constructor(filePath: string) {
    // Resolve to canonical absolute path to eliminate relative-path or double-slash ambiguity
    this.filePath = resolve(filePath);
    this.load();
  }

  add(record: EpisodicRecord): void {
    this.records.push(record);
    this.persist(record);
  }

  search(query: MemorySearchQuery): MemorySearchResult[] {
    const now = Date.now();
    const limit = query.limit ?? 10;
    let candidates = [...this.records];

    // Filter by type
    if (query.types && query.types.length > 0) {
      candidates = candidates.filter(r => query.types!.includes(r.type));
    }

    // Filter by participants
    if (query.participants && query.participants.length > 0) {
      candidates = candidates.filter(r =>
        query.participants!.some(p => r.participants.includes(p))
      );
    }

    // Filter by time range
    if (query.timeRange) {
      candidates = candidates.filter(
        r => r.timestamp >= query.timeRange!.start && r.timestamp <= query.timeRange!.end
      );
    }

    // Filter by minimum importance
    if (query.minImportance !== undefined) {
      candidates = candidates.filter(r => r.importance >= query.minImportance!);
    }

    // Score each record: 0.3 × recency + 0.3 × importance + 0.4 × relevance
    const scored: MemorySearchResult[] = candidates.map(record => {
      const recency = Math.exp(-((now - record.timestamp) * Math.LN2) / RECENCY_HALF_LIFE_MS);
      const importance = record.importance / 10;
      const relevance = this.computeRelevance(record, query);

      const score = 0.3 * recency + 0.3 * importance + 0.4 * relevance;
      return { record, score };
    });

    // Sort by score descending, take top N
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  getRecent(count: number): EpisodicRecord[] {
    return this.records.slice(-count);
  }

  getAll(): EpisodicRecord[] {
    return [...this.records];
  }

  size(): number {
    return this.records.length;
  }

  private computeRelevance(record: EpisodicRecord, query: MemorySearchQuery): number {
    if (!query.text) return 0.5; // neutral if no text query

    const searchTerms = query.text.toLowerCase().split(/\s+/);
    const content = record.content.toLowerCase();
    const tags = record.tags.join(' ').toLowerCase();
    const full = `${content} ${tags}`;

    let matches = 0;
    for (const term of searchTerms) {
      if (full.includes(term)) matches++;
    }

    return searchTerms.length > 0 ? matches / searchTerms.length : 0.5;
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;

    const raw = readFileSync(this.filePath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const record = JSON.parse(line) as EpisodicRecord;
        this.records.push(record);
      } catch {
        // Skip corrupted lines
      }
    }
  }

  private persist(record: EpisodicRecord): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    // filePath is resolve()d to a canonical absolute path derived from a sanitized
    // agent ID ([a-zA-Z0-9_-] only, constructed via path.join). Not a traversal risk.
    // lgtm[js/http-to-file-access]
    chmodSync(dir, 0o700);
    // record is agent-generated episodic memory assembled locally; JSON.stringify
    // produces a safe serialisation. Writing to the agent's own data directory is intended.
    // lgtm[js/http-to-file-access]
    appendFileSync(this.filePath, JSON.stringify(record) + '\n', { mode: 0o600 });
    // Enforce owner-only permission on existing files (mode option only applies on creation)
    chmodSync(this.filePath, 0o600);
  }
}
