import {
  type ZoneId,
  type ZoneEnterPayload,
  type ZoneExitPayload,
  type ZoneBounds,
  getZoneBoundsMap,
} from '@openclawworld/shared';
import type { EntitySchema } from '../schemas/EntitySchema.js';
import type { EventLog } from '../events/EventLog.js';

export type { ZoneBounds };

export type ZoneEvent =
  | { type: 'zone.enter'; payload: ZoneEnterPayload }
  | { type: 'zone.exit'; payload: ZoneExitPayload };

export type ZoneTransitionResult = {
  previousZone: ZoneId | null;
  currentZone: ZoneId | null;
  changed: boolean;
};

export const DEFAULT_ZONE_BOUNDS: Map<ZoneId, ZoneBounds> = getZoneBoundsMap();

export class ZoneSystem {
  private zones: Map<ZoneId, ZoneBounds>;
  private entityZones: Map<string, ZoneId> = new Map();
  private zonePopulations: Map<ZoneId, number> = new Map();

  constructor(zones: Map<ZoneId, ZoneBounds>) {
    this.zones = zones;
    this.initializeZonePopulations();
  }

  private initializeZonePopulations(): void {
    for (const zoneId of this.zones.keys()) {
      this.zonePopulations.set(zoneId, 0);
    }
  }

  getZoneAtPosition(x: number, y: number): ZoneId | null {
    return this.detectZone(x, y);
  }

  detectZone(x: number, y: number): ZoneId | null {
    for (const [zoneId, bounds] of this.zones) {
      if (this.isInBounds(x, y, bounds)) {
        return zoneId;
      }
    }
    return null;
  }

  private isInBounds(x: number, y: number, bounds: ZoneBounds): boolean {
    return (
      x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height
    );
  }

  updateEntityZone(
    entityId: string,
    x: number,
    y: number,
    eventLog?: EventLog,
    roomId?: string,
    entity?: EntitySchema
  ): ZoneTransitionResult {
    const currentZone = this.detectZone(x, y);
    const previousZone = this.entityZones.get(entityId) ?? null;
    const changed = currentZone !== previousZone;

    if (changed) {
      if (previousZone !== null) {
        const prevCount = this.zonePopulations.get(previousZone) ?? 0;
        this.zonePopulations.set(previousZone, Math.max(0, prevCount - 1));

        if (eventLog && roomId) {
          const exitPayload: ZoneExitPayload = {
            entityId,
            zoneId: previousZone,
            nextZoneId: currentZone,
          };
          eventLog.append('zone.exit', roomId, exitPayload);
        }
      }

      if (currentZone !== null) {
        const currCount = this.zonePopulations.get(currentZone) ?? 0;
        this.zonePopulations.set(currentZone, currCount + 1);
        this.entityZones.set(entityId, currentZone);

        if (eventLog && roomId) {
          const enterPayload: ZoneEnterPayload = {
            entityId,
            zoneId: currentZone,
            previousZoneId: previousZone,
          };
          eventLog.append('zone.enter', roomId, enterPayload);
        }

        if (entity) {
          entity.setZone(currentZone);
        }
      } else {
        this.entityZones.delete(entityId);
      }
    }

    return { previousZone, currentZone, changed };
  }

  update(entities: Map<string, EntitySchema>, eventLog: EventLog, roomId: string): ZoneEvent[] {
    const events: ZoneEvent[] = [];

    for (const [entityId, entity] of entities) {
      const currentZone = this.detectZone(entity.pos.x, entity.pos.y);
      const previousZone = this.entityZones.get(entityId) ?? null;

      if (currentZone !== previousZone) {
        if (previousZone !== null) {
          const prevCount = this.zonePopulations.get(previousZone) ?? 0;
          this.zonePopulations.set(previousZone, Math.max(0, prevCount - 1));

          const exitPayload: ZoneExitPayload = {
            entityId,
            zoneId: previousZone,
            nextZoneId: currentZone,
          };
          events.push({ type: 'zone.exit', payload: exitPayload });
          eventLog.append('zone.exit', roomId, exitPayload);
        }

        if (currentZone !== null) {
          const currCount = this.zonePopulations.get(currentZone) ?? 0;
          this.zonePopulations.set(currentZone, currCount + 1);

          const enterPayload: ZoneEnterPayload = {
            entityId,
            zoneId: currentZone,
            previousZoneId: previousZone,
          };
          events.push({ type: 'zone.enter', payload: enterPayload });
          eventLog.append('zone.enter', roomId, enterPayload);
          entity.setZone(currentZone);
          this.entityZones.set(entityId, currentZone);
        } else {
          entity.clearZone();
          this.entityZones.delete(entityId);
        }
      }
    }

    for (const entityId of this.entityZones.keys()) {
      if (!entities.has(entityId)) {
        this.removeEntity(entityId);
      }
    }

    return events;
  }

  removeEntity(entityId: string, eventLog?: EventLog, roomId?: string): ZoneId | null {
    const previousZone = this.entityZones.get(entityId) ?? null;

    if (previousZone !== null) {
      const prevCount = this.zonePopulations.get(previousZone) ?? 0;
      this.zonePopulations.set(previousZone, Math.max(0, prevCount - 1));

      this.entityZones.delete(entityId);

      if (eventLog && roomId) {
        const exitPayload: ZoneExitPayload = {
          entityId,
          zoneId: previousZone,
          nextZoneId: null,
        };
        eventLog.append('zone.exit', roomId, exitPayload);
      }
    }

    return previousZone;
  }

  getZonePopulation(zoneId: ZoneId): number {
    return this.zonePopulations.get(zoneId) ?? 0;
  }

  getEntityZone(entityId: string): ZoneId | null {
    return this.entityZones.get(entityId) ?? null;
  }

  getEntitiesInZone(zoneId: ZoneId): string[] {
    const entities: string[] = [];
    for (const [entityId, zone] of this.entityZones) {
      if (zone === zoneId) {
        entities.push(entityId);
      }
    }
    return entities;
  }

  getZoneBounds(zoneId: ZoneId): ZoneBounds | undefined {
    return this.zones.get(zoneId);
  }

  getZoneIds(): ZoneId[] {
    return Array.from(this.zones.keys());
  }
}
