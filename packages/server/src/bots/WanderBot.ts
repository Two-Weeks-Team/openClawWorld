import type { CollisionSystem } from '../collision/CollisionSystem.js';
import type { MovementSystem } from '../movement/MovementSystem.js';
import type { ZoneSystem } from '../zone/ZoneSystem.js';
import type { EventLog } from '../events/EventLog.js';
import type { EntitySchema } from '../schemas/EntitySchema.js';
import type { ZoneId } from '@openclawworld/shared';

export type WanderBotOptions = {
  /** Entity ID for this bot */
  entityId: string;
  /** Room ID the bot is in */
  roomId: string;
  /** Minimum wait time between moves (ms) */
  minWaitMs?: number;
  /** Maximum wait time between moves (ms) */
  maxWaitMs?: number;
  /** Maximum attempts to find valid destination */
  maxRetries?: number;
  /** Random seed for deterministic behavior (optional) */
  seed?: number;
};

export type WanderBotState = {
  entityId: string;
  currentZone: ZoneId | null;
  zonesVisited: ZoneId[];
  moveCount: number;
  isWaiting: boolean;
  lastMoveTime: number;
};

/**
 * WanderBot - AI entity that walks randomly around the map
 *
 * Features:
 * - Respects collision (won't walk through walls)
 * - Triggers zone enter/exit events
 * - Configurable wander timing
 * - Tracks zones visited for testing
 */
export class WanderBot {
  private entityId: string;
  private roomId: string;
  private minWaitMs: number;
  private maxWaitMs: number;
  private maxRetries: number;

  private collisionSystem: CollisionSystem;
  private movementSystem: MovementSystem;
  private zoneSystem: ZoneSystem;
  private eventLog: EventLog;
  private entity: EntitySchema;

  private currentZone: ZoneId | null = null;
  private zonesVisited: ZoneId[] = [];
  private moveCount: number = 0;
  private lastMoveTime: number = 0;
  private nextMoveTime: number = 0;
  private isActive: boolean = false;

  private seed: number;
  private randomState: number;

  constructor(
    options: WanderBotOptions,
    entity: EntitySchema,
    collisionSystem: CollisionSystem,
    movementSystem: MovementSystem,
    zoneSystem: ZoneSystem,
    eventLog: EventLog
  ) {
    this.entityId = options.entityId;
    this.roomId = options.roomId;
    this.minWaitMs = options.minWaitMs ?? 500;
    this.maxWaitMs = options.maxWaitMs ?? 2000;
    this.maxRetries = options.maxRetries ?? 10;
    this.seed = options.seed ?? Date.now();
    this.randomState = this.seed;

    this.entity = entity;
    this.collisionSystem = collisionSystem;
    this.movementSystem = movementSystem;
    this.zoneSystem = zoneSystem;
    this.eventLog = eventLog;

    this.updateZone();
  }

  /**
   * Seeded random number generator (LCG)
   * Uses Math.imul for proper 32-bit multiplication and divides by 0x80000000
   * to ensure the result is in [0, 1) (never returns exactly 1.0)
   */
  private random(): number {
    this.randomState = (Math.imul(this.randomState, 1103515245) + 12345) >>> 0;
    return (this.randomState >>> 1) / 0x80000000;
  }

  /**
   * Random integer in range [min, max]
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Start the wandering behavior
   */
  start(): void {
    this.isActive = true;
    this.scheduleNextMove();
  }

  /**
   * Stop the wandering behavior
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * Check if bot is active
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get current bot state (for testing/debugging)
   */
  getState(): WanderBotState {
    return {
      entityId: this.entityId,
      currentZone: this.currentZone,
      zonesVisited: [...this.zonesVisited],
      moveCount: this.moveCount,
      isWaiting: !this.movementSystem.isMoving(this.entityId),
      lastMoveTime: this.lastMoveTime,
    };
  }

  /**
   * Update the bot - call this from the game tick
   */
  update(currentTimeMs: number): void {
    if (!this.isActive) return;

    this.updateZone();

    if (currentTimeMs >= this.nextMoveTime && !this.movementSystem.isMoving(this.entityId)) {
      this.tryMove();
      this.scheduleNextMove();
    }
  }

  /**
   * Force an immediate move (useful for testing)
   */
  forceMove(): boolean {
    return this.tryMove();
  }

  /**
   * Move to a specific tile (bypasses random selection)
   */
  moveTo(tx: number, ty: number): boolean {
    if (this.collisionSystem.isBlocked(tx, ty)) {
      return false;
    }

    const result = this.movementSystem.setDestination(this.entityId, tx, ty);
    if (result === 'accepted') {
      this.moveCount++;
      this.lastMoveTime = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Update zone tracking
   */
  private updateZone(): void {
    const result = this.zoneSystem.updateEntityZone(
      this.entityId,
      this.entity.pos.x,
      this.entity.pos.y,
      this.eventLog,
      this.roomId,
      this.entity
    );

    if (result.changed && result.currentZone !== null) {
      this.currentZone = result.currentZone;
      if (!this.zonesVisited.includes(result.currentZone)) {
        this.zonesVisited.push(result.currentZone);
      }
    }
  }

  /**
   * Try to move to a random valid tile
   */
  private tryMove(): boolean {
    const dims = this.collisionSystem.getMapDimensions();
    const currentTile = this.collisionSystem.worldToTile(this.entity.pos.x, this.entity.pos.y);

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const direction = this.randomInt(0, 7);
      const distance = this.randomInt(1, 5);

      const DIRECTION_DX = [0, 1, 1, 1, 0, -1, -1, -1];
      const DIRECTION_DY = [-1, -1, 0, 1, 1, 1, 0, -1];
      const dx = DIRECTION_DX[direction];
      const dy = DIRECTION_DY[direction];

      const targetTx = currentTile.tx + dx * distance;
      const targetTy = currentTile.ty + dy * distance;

      const outOfBounds =
        targetTx < 0 || targetTx >= dims.width || targetTy < 0 || targetTy >= dims.height;
      if (outOfBounds) continue;

      if (this.collisionSystem.isBlocked(targetTx, targetTy)) continue;

      const result = this.movementSystem.setDestination(this.entityId, targetTx, targetTy);
      if (result === 'accepted') {
        this.moveCount++;
        this.lastMoveTime = Date.now();
        return true;
      }
    }

    return false;
  }

  /**
   * Schedule the next move
   */
  private scheduleNextMove(): void {
    const waitTime = this.randomInt(this.minWaitMs, this.maxWaitMs);
    this.nextMoveTime = Date.now() + waitTime;
  }

  /**
   * Get zones visited (for testing)
   */
  getZonesVisited(): ZoneId[] {
    return [...this.zonesVisited];
  }

  /**
   * Get move count (for testing)
   */
  getMoveCount(): number {
    return this.moveCount;
  }

  /**
   * Get current zone (for testing)
   */
  getCurrentZone(): ZoneId | null {
    return this.currentZone;
  }
}
