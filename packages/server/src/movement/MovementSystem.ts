import type { CollisionSystem } from '../collision/CollisionSystem.js';
import type { EntitySchema } from '../schemas/EntitySchema.js';
import type { MoveToResult, Facing } from '@openclawworld/shared';
import { MAX_MOVE_SPEED } from '../constants.js';

export { type MoveToResult };

interface MovementState {
  destX: number;
  destY: number;
  destTx: number;
  destTy: number;
}

export class MovementSystem {
  private collisionSystem: CollisionSystem;
  private baseSpeed: number;
  private destinations: Map<string, MovementState> = new Map();

  constructor(collisionSystem: CollisionSystem, speed: number) {
    this.collisionSystem = collisionSystem;
    this.baseSpeed = Math.min(speed, MAX_MOVE_SPEED);
  }

  setDestination(
    entityId: string,
    destTx: number,
    destTy: number,
    currentPos?: { x: number; y: number }
  ): MoveToResult {
    const destWorld = this.collisionSystem.tileToWorld(destTx, destTy);

    if (!this.collisionSystem.isInBounds(destTx, destTy)) {
      return 'rejected';
    }

    if (this.collisionSystem.isBlocked(destTx, destTy)) {
      return 'rejected';
    }

    const existing = this.destinations.get(entityId);
    if (existing && existing.destTx === destTx && existing.destTy === destTy) {
      return 'no_op';
    }

    // If current position is provided, validate that the first movement step won't be blocked
    if (currentPos) {
      const dx = destWorld.x - currentPos.x;
      const dy = destWorld.y - currentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= 1) {
        // Simulate one tick of movement to check the first step
        const stepDistance = Math.min(this.baseSpeed * 0.05, distance); // ~1 tick at 20 fps
        const stepX = currentPos.x + (dx / distance) * stepDistance;
        const stepY = currentPos.y + (dy / distance) * stepDistance;
        const stepTile = this.collisionSystem.worldToTile(stepX, stepY);

        if (this.collisionSystem.isBlocked(stepTile.tx, stepTile.ty)) {
          return 'rejected';
        }
      }
    }

    this.destinations.set(entityId, {
      destX: destWorld.x,
      destY: destWorld.y,
      destTx,
      destTy,
    });

    return 'accepted';
  }

  update(deltaMs: number, entities: Map<string, EntitySchema>): void {
    const deltaSeconds = deltaMs / 1000;

    for (const [entityId, movementState] of this.destinations.entries()) {
      const entity = entities.get(entityId);
      if (!entity) {
        this.destinations.delete(entityId);
        continue;
      }

      const currentX = entity.pos.x;
      const currentY = entity.pos.y;

      const dx = movementState.destX - currentX;
      const dy = movementState.destY - currentY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1) {
        entity.setPosition(movementState.destX, movementState.destY);
        entity.setTile(movementState.destTx, movementState.destTy);
        this.destinations.delete(entityId);
        continue;
      }

      const speed = Math.min(entity.speed || this.baseSpeed, MAX_MOVE_SPEED);
      const maxMoveDistance = speed * deltaSeconds;

      const moveDistance = Math.min(distance, maxMoveDistance);
      const newX = currentX + (dx / distance) * moveDistance;
      const newY = currentY + (dy / distance) * moveDistance;

      const newTile = this.collisionSystem.worldToTile(newX, newY);

      if (this.collisionSystem.isBlocked(newTile.tx, newTile.ty)) {
        this.destinations.delete(entityId);
        continue;
      }

      this.updateFacing(entity, dx, dy);

      entity.setPosition(newX, newY);
      entity.setTile(newTile.tx, newTile.ty);

      if (moveDistance >= distance) {
        this.destinations.delete(entityId);
      }
    }
  }

  private updateFacing(entity: EntitySchema, dx: number, dy: number): void {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    let facing: Facing;
    if (absX > absY) {
      facing = dx > 0 ? 'right' : 'left';
    } else {
      facing = dy > 0 ? 'down' : 'up';
    }

    entity.setFacing(facing);
  }

  clearDestination(entityId: string): void {
    this.destinations.delete(entityId);
  }

  isMoving(entityId: string): boolean {
    return this.destinations.has(entityId);
  }
}
