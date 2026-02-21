/**
 * RelationshipManager - Tracks relationships between agents
 *
 * Persists relationship data and manages category transitions.
 */

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import type { Relationship, InteractionSummary } from '../types/social.types.js';
import type { RelationshipCategory, RelationshipSummary } from '../types/agent.types.js';

const CATEGORY_THRESHOLDS: Array<{
  category: RelationshipCategory;
  minCloseness: number;
  minFamiliarity: number;
}> = [
  { category: 'close_friend', minCloseness: 0.6, minFamiliarity: 15 },
  { category: 'friend', minCloseness: 0.3, minFamiliarity: 8 },
  { category: 'acquaintance', minCloseness: -0.2, minFamiliarity: 2 },
  { category: 'rival', minCloseness: -0.5, minFamiliarity: 3 },
  { category: 'enemy', minCloseness: -0.7, minFamiliarity: 5 },
  { category: 'stranger', minCloseness: -1, minFamiliarity: 0 },
];

export class RelationshipManager {
  private relationships: Map<string, Relationship> = new Map();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  getRelationship(entityId: string): Relationship | undefined {
    return this.relationships.get(entityId);
  }

  getOrCreate(entityId: string, entityName: string): Relationship {
    let rel = this.relationships.get(entityId);
    if (!rel) {
      rel = {
        entityId,
        entityName,
        closeness: 0,
        trust: 0,
        familiarity: 0,
        category: 'stranger',
        impressions: [],
        lastInteraction: Date.now(),
        firstMet: Date.now(),
        interactionLog: [],
      };
      this.relationships.set(entityId, rel);
    }
    return rel;
  }

  recordInteraction(
    entityId: string,
    entityName: string,
    type: InteractionSummary['type'],
    summary: string,
    closenessChange: number,
    trustChange: number
  ): void {
    const rel = this.getOrCreate(entityId, entityName);

    rel.closeness = clamp(rel.closeness + closenessChange, -1, 1);
    rel.trust = clamp(rel.trust + trustChange, -1, 1);
    rel.familiarity++;
    rel.lastInteraction = Date.now();

    rel.interactionLog.push({
      timestamp: Date.now(),
      type,
      summary,
      closenessChange,
      trustChange,
    });

    // Keep last 50 interactions
    if (rel.interactionLog.length > 50) {
      rel.interactionLog = rel.interactionLog.slice(-50);
    }

    rel.category = this.computeCategory(rel);
    this.save();
  }

  addImpression(entityId: string, impression: string): void {
    const rel = this.relationships.get(entityId);
    if (!rel) return;

    rel.impressions.push(impression);
    // Keep last 10 impressions
    if (rel.impressions.length > 10) {
      rel.impressions = rel.impressions.slice(-10);
    }
    this.save();
  }

  getAllSummaries(): RelationshipSummary[] {
    return [...this.relationships.values()].map(r => ({
      entityId: r.entityId,
      entityName: r.entityName,
      closeness: r.closeness,
      trust: r.trust,
      category: r.category,
      lastInteraction: r.lastInteraction,
    }));
  }

  getRelationshipsForPrompt(nearbyIds: string[]): RelationshipSummary[] {
    // Return relationships for nearby entities + top 5 most significant
    const nearby = nearbyIds
      .map(id => this.relationships.get(id))
      .filter((r): r is Relationship => r !== undefined)
      .map(r => ({
        entityId: r.entityId,
        entityName: r.entityName,
        closeness: r.closeness,
        trust: r.trust,
        category: r.category,
        lastInteraction: r.lastInteraction,
      }));

    const significant = [...this.relationships.values()]
      .filter(r => !nearbyIds.includes(r.entityId))
      .sort((a, b) => Math.abs(b.closeness) - Math.abs(a.closeness))
      .slice(0, 5)
      .map(r => ({
        entityId: r.entityId,
        entityName: r.entityName,
        closeness: r.closeness,
        trust: r.trust,
        category: r.category,
        lastInteraction: r.lastInteraction,
      }));

    return [...nearby, ...significant];
  }

  private computeCategory(rel: Relationship): RelationshipCategory {
    // Check negative categories first
    if (rel.closeness < -0.5 && rel.familiarity >= 5) return 'enemy';
    if (rel.closeness < -0.3 && rel.familiarity >= 3) return 'rival';

    // Positive categories
    for (const threshold of CATEGORY_THRESHOLDS) {
      if (threshold.category === 'rival' || threshold.category === 'enemy') continue;
      if (rel.closeness >= threshold.minCloseness && rel.familiarity >= threshold.minFamiliarity) {
        return threshold.category;
      }
    }

    return 'stranger';
  }

  save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    // Enforce owner-only permissions on both new and pre-existing directories/files.
    // chmodSync is called unconditionally because the mode option on mkdirSync/writeFileSync
    // only applies at creation time and has no effect on existing filesystem objects.
    chmodSync(dir, 0o700);
    const data = [...this.relationships.values()];
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), { mode: 0o600 });
    chmodSync(this.filePath, 0o600);
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(raw) as Relationship[];
      for (const rel of data) {
        this.relationships.set(rel.entityId, rel);
      }
    } catch {
      // Start fresh
    }
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
