/**
 * SemanticMemory - Generalized knowledge and beliefs (JSON)
 *
 * Stores agent's beliefs, preferences, and world knowledge.
 * Updated during reflection cycles.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { SemanticEntry, SemanticCategory } from '../types/memory.types.js';
import { randomUUID } from 'crypto';

export class SemanticMemory {
  private entries: Map<string, SemanticEntry> = new Map();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  add(entry: Omit<SemanticEntry, 'id' | 'createdAt' | 'updatedAt'>): SemanticEntry {
    const now = Date.now();
    const full: SemanticEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.entries.set(full.id, full);
    this.save();
    return full;
  }

  update(
    id: string,
    updates: Partial<Pick<SemanticEntry, 'content' | 'confidence' | 'sources'>>
  ): void {
    const entry = this.entries.get(id);
    if (!entry) return;

    if (updates.content !== undefined) entry.content = updates.content;
    if (updates.confidence !== undefined) entry.confidence = updates.confidence;
    if (updates.sources !== undefined)
      entry.sources = [...new Set([...entry.sources, ...updates.sources])];
    entry.updatedAt = Date.now();

    this.save();
  }

  getByCategory(category: SemanticCategory): SemanticEntry[] {
    return [...this.entries.values()].filter(e => e.category === category);
  }

  getBySubject(subject: string): SemanticEntry[] {
    const lower = subject.toLowerCase();
    return [...this.entries.values()].filter(
      e => e.subject.toLowerCase().includes(lower) || e.content.toLowerCase().includes(lower)
    );
  }

  getAll(): SemanticEntry[] {
    return [...this.entries.values()];
  }

  size(): number {
    return this.entries.size;
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(raw) as SemanticEntry[];
      for (const entry of data) {
        this.entries.set(entry.id, entry);
      }
    } catch {
      // Start fresh on corruption
    }
  }

  private save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    writeFileSync(this.filePath, JSON.stringify([...this.entries.values()], null, 2), { mode: 0o600 });
  }
}
