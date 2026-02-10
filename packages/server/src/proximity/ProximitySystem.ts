import type { ProximityEnterPayload, ProximityExitPayload } from '@openclawworld/shared';

export type EntityPosition = {
  id: string;
  x: number;
  y: number;
};

export type ProximityEvent =
  | { type: 'proximity.enter'; payload: ProximityEnterPayload }
  | { type: 'proximity.exit'; payload: ProximityExitPayload };

/**
 * Detects when entities enter or exit each other's proximity radius.
 * Emits bidirectional events and debounces to prevent flapping.
 */
export class ProximitySystem {
  private radius: number;
  private debounceMs: number;
  private proximitySet: Map<string, Set<string>> = new Map();
  private lastEvents: Map<string, number> = new Map();

  constructor(radius: number, debounceMs: number) {
    this.radius = radius;
    this.debounceMs = debounceMs;
  }

  /**
   * Update all proximity relationships and return events.
   * O(n²) comparison - acceptable for small entity counts (15-20 entities).
   */
  update(entities: Map<string, EntityPosition>): ProximityEvent[] {
    const now = Date.now();
    const events: ProximityEvent[] = [];
    const entityList = Array.from(entities.values());

    // Build new proximity state
    const newProximitySet = new Map<string, Set<string>>();

    // O(n²) pairwise comparison - acceptable for small entity counts
    for (let i = 0; i < entityList.length; i++) {
      const entityA = entityList[i];

      for (let j = i + 1; j < entityList.length; j++) {
        const entityB = entityList[j];

        const distance = this.calculateDistance(entityA, entityB);
        const isInProximity = distance <= this.radius;

        const wasInProximity = this.areInProximity(entityA.id, entityB.id);

        if (isInProximity && !wasInProximity) {
          // Enter event - check debounce
          const eventKey = this.getEventKey(entityA.id, entityB.id, 'enter');
          const lastEventTime = this.lastEvents.get(eventKey) ?? 0;

          if (now - lastEventTime >= this.debounceMs) {
            // Bidirectional enter events
            events.push({
              type: 'proximity.enter',
              payload: {
                subjectId: entityA.id,
                otherId: entityB.id,
                distance,
              },
            });
            events.push({
              type: 'proximity.enter',
              payload: {
                subjectId: entityB.id,
                otherId: entityA.id,
                distance,
              },
            });
            this.lastEvents.set(eventKey, now);
          }

          // Track new proximity relationship
          this.addToProximitySet(newProximitySet, entityA.id, entityB.id);
        } else if (!isInProximity && wasInProximity) {
          // Exit event - check debounce
          const eventKey = this.getEventKey(entityA.id, entityB.id, 'exit');
          const lastEventTime = this.lastEvents.get(eventKey) ?? 0;

          if (now - lastEventTime >= this.debounceMs) {
            // Bidirectional exit events
            events.push({
              type: 'proximity.exit',
              payload: {
                subjectId: entityA.id,
                otherId: entityB.id,
              },
            });
            events.push({
              type: 'proximity.exit',
              payload: {
                subjectId: entityB.id,
                otherId: entityA.id,
              },
            });
            this.lastEvents.set(eventKey, now);
          }
        } else if (isInProximity) {
          // Still in proximity, carry over the relationship
          this.addToProximitySet(newProximitySet, entityA.id, entityB.id);
        }
      }
    }

    // Update proximity state
    this.proximitySet = newProximitySet;

    // Cleanup old debounce entries (keep last 1000 entries)
    if (this.lastEvents.size > 1000) {
      this.cleanupOldEvents(now);
    }

    return events;
  }

  /**
   * Calculate Euclidean distance between two entities.
   */
  private calculateDistance(a: EntityPosition, b: EntityPosition): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if two entities are currently in proximity.
   */
  private areInProximity(idA: string, idB: string): boolean {
    const setA = this.proximitySet.get(idA);
    return setA?.has(idB) ?? false;
  }

  /**
   * Add a bidirectional proximity relationship to the set.
   */
  private addToProximitySet(set: Map<string, Set<string>>, idA: string, idB: string): void {
    if (!set.has(idA)) {
      set.set(idA, new Set());
    }
    if (!set.has(idB)) {
      set.set(idB, new Set());
    }
    set.get(idA)!.add(idB);
    set.get(idB)!.add(idA);
  }

  /**
   * Get a unique key for debounce tracking.
   */
  private getEventKey(idA: string, idB: string, eventType: 'enter' | 'exit'): string {
    // Sort IDs to ensure consistent key regardless of order
    const sortedIds = [idA, idB].sort();
    return `${sortedIds[0]}:${sortedIds[1]}:${eventType}`;
  }

  /**
   * Cleanup old debounce entries to prevent memory leaks.
   */
  private cleanupOldEvents(now: number): void {
    const cutoffTime = now - this.debounceMs * 10;
    for (const [key, timestamp] of this.lastEvents) {
      if (timestamp < cutoffTime) {
        this.lastEvents.delete(key);
      }
    }
  }

  /**
   * Get the current proximity radius.
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Get the current debounce time.
   */
  getDebounceMs(): number {
    return this.debounceMs;
  }

  /**
   * Get all entities currently in proximity of a given entity.
   */
  getNearbyEntities(entityId: string): string[] {
    const nearby = this.proximitySet.get(entityId);
    return nearby ? Array.from(nearby) : [];
  }
}
