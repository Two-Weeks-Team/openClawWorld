/**
 * MovementPlanner - Zone-aware destination selection
 *
 * Uses zone coordinates from the world to plan meaningful movement.
 */

export type ZoneCoords = {
  id: string;
  name: string;
  centerTile: { tx: number; ty: number };
  bounds: { minTx: number; minTy: number; maxTx: number; maxTy: number };
};

/** Known zone coordinates from the openClawWorld village map */
const ZONE_MAP: Record<string, ZoneCoords> = {
  lobby: {
    id: 'lobby',
    name: 'Lobby',
    centerTile: { tx: 25, ty: 18 },
    bounds: { minTx: 20, minTy: 14, maxTx: 30, maxTy: 22 },
  },
  office: {
    id: 'office',
    name: 'Office',
    centerTile: { tx: 12, ty: 8 },
    bounds: { minTx: 6, minTy: 4, maxTx: 18, maxTy: 12 },
  },
  'central-park': {
    id: 'central-park',
    name: 'Central Park',
    centerTile: { tx: 25, ty: 30 },
    bounds: { minTx: 18, minTy: 24, maxTx: 32, maxTy: 36 },
  },
  arcade: {
    id: 'arcade',
    name: 'Arcade',
    centerTile: { tx: 40, ty: 8 },
    bounds: { minTx: 35, minTy: 4, maxTx: 45, maxTy: 12 },
  },
  meeting: {
    id: 'meeting',
    name: 'Meeting Room',
    centerTile: { tx: 12, ty: 18 },
    bounds: { minTx: 6, minTy: 14, maxTx: 18, maxTy: 22 },
  },
  'lounge-cafe': {
    id: 'lounge-cafe',
    name: 'Lounge Cafe',
    centerTile: { tx: 40, ty: 18 },
    bounds: { minTx: 35, minTy: 14, maxTx: 45, maxTy: 22 },
  },
  plaza: {
    id: 'plaza',
    name: 'Plaza',
    centerTile: { tx: 25, ty: 42 },
    bounds: { minTx: 18, minTy: 38, maxTx: 32, maxTy: 46 },
  },
  lake: {
    id: 'lake',
    name: 'Lake',
    centerTile: { tx: 40, ty: 35 },
    bounds: { minTx: 35, minTy: 30, maxTx: 45, maxTy: 40 },
  },
};

export class MovementPlanner {
  getZoneTarget(zoneId: string): { tx: number; ty: number } | null {
    const zone = ZONE_MAP[zoneId];
    if (!zone) return null;

    // Add some randomness within the zone bounds
    const tx =
      zone.bounds.minTx + Math.floor(Math.random() * (zone.bounds.maxTx - zone.bounds.minTx));
    const ty =
      zone.bounds.minTy + Math.floor(Math.random() * (zone.bounds.maxTy - zone.bounds.minTy));
    return { tx, ty };
  }

  getRandomZone(exclude?: string): string {
    const zones = Object.keys(ZONE_MAP).filter(z => z !== exclude);
    return zones[Math.floor(Math.random() * zones.length)]!;
  }

  getRandomNearbyTile(
    currentTile: { tx: number; ty: number },
    radius = 5
  ): { tx: number; ty: number } {
    const dx = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
    const dy = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
    return {
      tx: Math.max(0, currentTile.tx + dx),
      ty: Math.max(0, currentTile.ty + dy),
    };
  }

  getPreferredZoneTarget(
    preferredZones: string[],
    currentZone: string | null
  ): { tx: number; ty: number; zone: string } {
    // Filter out current zone, prefer listed zones
    const candidates = preferredZones.filter(z => z !== currentZone);
    const target =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]!
        : this.getRandomZone(currentZone ?? undefined);

    const tile = this.getZoneTarget(target) ?? { tx: 25, ty: 25 };
    return { ...tile, zone: target };
  }

  getZoneInfo(zoneId: string): ZoneCoords | undefined {
    return ZONE_MAP[zoneId];
  }

  getAllZones(): ZoneCoords[] {
    return Object.values(ZONE_MAP);
  }
}
