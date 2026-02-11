import { Schema, type } from '@colyseus/schema';

/**
 * Active effect applied to an entity.
 * Key in MapSchema: effect instance id (e.g., `eff_001`)
 */
export class ActiveEffectSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  effectType: string = '';

  @type('string')
  sourceEntityId: string = '';

  @type('string')
  targetEntityId: string = '';

  @type('number')
  startTime: number = 0;

  @type('number')
  expirationTime: number = 0;

  @type('number')
  speedMultiplier: number = 1.0;

  constructor(
    id?: string,
    effectType?: string,
    sourceEntityId?: string,
    targetEntityId?: string,
    durationMs?: number,
    speedMultiplier?: number
  ) {
    super();
    if (id) this.id = id;
    if (effectType) this.effectType = effectType;
    if (sourceEntityId) this.sourceEntityId = sourceEntityId;
    if (targetEntityId) this.targetEntityId = targetEntityId;
    if (durationMs !== undefined) {
      this.startTime = Date.now();
      this.expirationTime = this.startTime + durationMs;
    }
    if (speedMultiplier !== undefined) this.speedMultiplier = speedMultiplier;
  }

  /**
   * Check if effect has expired
   */
  isExpired(): boolean {
    return Date.now() >= this.expirationTime;
  }

  /**
   * Get remaining duration in ms
   */
  getRemainingMs(): number {
    return Math.max(0, this.expirationTime - Date.now());
  }
}
