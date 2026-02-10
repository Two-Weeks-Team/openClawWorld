import type { ZoneId, ZoneEnterPayload, ZoneExitPayload } from '@openclawworld/shared';
import type { EntitySchema } from '../schemas/EntitySchema.js';
import type { EventLog } from '../events/EventLog.js';

export type ZoneBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ZoneEvent =
  | { type: 'zone.enter'; payload: ZoneEnterPayload }
  | { type: 'zone.exit'; payload: ZoneExitPayload };

export const DEFAULT_ZONE_BOUNDS: Map<ZoneId, ZoneBounds> = new Map([
  ['lobby', { x: 0, y: 0, width: 320, height: 320 }],
  ['office', { x: 320, y: 0, width: 320, height: 320 }],
  ['meeting-center', { x: 0, y: 320, width: 320, height: 320 }],
  ['lounge-cafe', { x: 320, y: 320, width: 320, height: 320 }],
  ['arcade', { x: 640, y: 0, width: 320, height: 640 }],
]);

export class ZoneSystem {
  private zones: Map<ZoneId, ZoneBounds>;
  private entityZones: Map<string, ZoneId> = new Map();

  constructor(zones: Map<ZoneId, ZoneBounds>) {
    this.zones = zones;
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

  update(entities: Map<string, EntitySchema>, eventLog: EventLog, roomId: string): ZoneEvent[] {
    const events: ZoneEvent[] = [];

    for (const [entityId, entity] of entities) {
      const currentZone = this.detectZone(entity.pos.x, entity.pos.y);
      const previousZone = this.entityZones.get(entityId) ?? null;

      if (currentZone !== previousZone) {
        if (previousZone !== null) {
          const exitPayload: ZoneExitPayload = {
            entityId,
            zoneId: previousZone,
            nextZoneId: currentZone,
          };
          events.push({ type: 'zone.exit', payload: exitPayload });
          eventLog.append('zone.exit', roomId, exitPayload);
        }

        if (currentZone !== null) {
          const enterPayload: ZoneEnterPayload = {
            entityId,
            zoneId: currentZone,
            previousZoneId: previousZone,
          };
          events.push({ type: 'zone.enter', payload: enterPayload });
          eventLog.append('zone.enter', roomId, enterPayload);
          entity.setZone(currentZone);
        }

        if (currentZone !== null) {
          this.entityZones.set(entityId, currentZone);
        } else {
          this.entityZones.delete(entityId);
        }
      }
    }

    for (const entityId of this.entityZones.keys()) {
      if (!entities.has(entityId)) {
        this.entityZones.delete(entityId);
      }
    }

    return events;
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
