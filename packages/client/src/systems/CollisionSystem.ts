import type { TileInfo, WorldGrid } from '@openclawworld/shared';

export class ClientCollisionSystem {
  private worldGrid: WorldGrid | null = null;
  private width: number = 0;
  private height: number = 0;
  private tileSize: number = 32;

  setWorldGrid(grid: WorldGrid, tileSize: number = 32): void {
    this.worldGrid = grid;
    this.tileSize = tileSize;
    this.height = grid.length;
    this.width = grid.length > 0 ? grid[0].length : 0;
  }

  isBlocked(tx: number, ty: number): boolean {
    if (!this.worldGrid) return true;
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return true;
    return this.worldGrid[ty][tx].collision;
  }

  isPassable(x: number, y: number): boolean {
    const tile = this.worldToTile(x, y);
    return !this.isBlocked(tile.tx, tile.ty);
  }

  worldToTile(x: number, y: number): { tx: number; ty: number } {
    const tx = Math.floor(x / this.tileSize);
    const ty = Math.floor(y / this.tileSize);
    return { tx, ty };
  }

  tileToWorld(tx: number, ty: number): { x: number; y: number } {
    const x = tx * this.tileSize + this.tileSize / 2;
    const y = ty * this.tileSize + this.tileSize / 2;
    return { x, y };
  }

  canMoveTo(fromTx: number, fromTy: number, toTx: number, toTy: number): boolean {
    if (this.isBlocked(toTx, toTy)) return false;

    const dx = Math.abs(toTx - fromTx);
    const dy = Math.abs(toTy - fromTy);
    if (dx > 1 || dy > 1) return false;

    if (dx === 1 && dy === 1) {
      if (this.isBlocked(fromTx, toTy) && this.isBlocked(toTx, fromTy)) {
        return false;
      }
    }

    return true;
  }

  predictMovement(
    currentTx: number,
    currentTy: number,
    targetTx: number,
    targetTy: number
  ): { tx: number; ty: number; blocked: boolean } {
    if (!this.canMoveTo(currentTx, currentTy, targetTx, targetTy)) {
      return { tx: currentTx, ty: currentTy, blocked: true };
    }
    return { tx: targetTx, ty: targetTy, blocked: false };
  }

  getTileAt(tx: number, ty: number): TileInfo | null {
    if (!this.worldGrid) return null;
    if (ty < 0 || ty >= this.height) return null;
    if (tx < 0 || tx >= this.width) return null;
    return this.worldGrid[ty][tx];
  }

  isDoorTile(tx: number, ty: number): boolean {
    const tile = this.getTileAt(tx, ty);
    return tile?.isDoor || false;
  }
}
