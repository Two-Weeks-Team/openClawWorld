import type { CollisionSystem } from '../collision/CollisionSystem.js';
import type { TileCoord } from '@openclawworld/shared';

interface AStarNode {
  tx: number;
  ty: number;
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to end)
  f: number; // g + h
  parent: AStarNode | null;
}

/**
 * Find a path from start to end using A* on the collision grid.
 * Returns an array of tile coordinates from start (exclusive) to end (inclusive),
 * or null if no path exists.
 *
 * @param collision - The collision system providing blocked/bounds checks
 * @param start - Start tile coordinate
 * @param end - End tile coordinate
 * @param maxNodes - Maximum nodes to explore before giving up (prevents runaway on large maps)
 */
export function findPath(
  collision: CollisionSystem,
  start: TileCoord,
  end: TileCoord,
  maxNodes: number = 2000
): TileCoord[] | null {
  if (collision.isBlocked(end.tx, end.ty) || !collision.isInBounds(end.tx, end.ty)) {
    return null;
  }

  if (start.tx === end.tx && start.ty === end.ty) {
    return [];
  }

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    tx: start.tx,
    ty: start.ty,
    g: 0,
    h: heuristic(start.tx, start.ty, end.tx, end.ty),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  let explored = 0;

  // 4-directional neighbors (no diagonals for tile-based movement)
  const dx = [0, 1, 0, -1];
  const dy = [-1, 0, 1, 0];

  while (openSet.length > 0 && explored < maxNodes) {
    explored++;

    // Find node with lowest f score
    let bestIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[bestIdx].f) {
        bestIdx = i;
      }
    }

    const current = openSet[bestIdx];
    openSet.splice(bestIdx, 1);

    if (current.tx === end.tx && current.ty === end.ty) {
      return reconstructPath(current);
    }

    const key = `${current.tx},${current.ty}`;
    closedSet.add(key);

    for (let i = 0; i < 4; i++) {
      const nx = current.tx + dx[i];
      const ny = current.ty + dy[i];
      const nKey = `${nx},${ny}`;

      if (closedSet.has(nKey)) continue;
      if (!collision.isInBounds(nx, ny)) continue;
      if (collision.isBlocked(nx, ny)) continue;

      const g = current.g + 1;
      const h = heuristic(nx, ny, end.tx, end.ty);

      // Check if this neighbor is already in openSet with a better g
      const existingIdx = openSet.findIndex(n => n.tx === nx && n.ty === ny);
      if (existingIdx !== -1) {
        if (g < openSet[existingIdx].g) {
          openSet[existingIdx].g = g;
          openSet[existingIdx].f = g + h;
          openSet[existingIdx].parent = current;
        }
        continue;
      }

      openSet.push({
        tx: nx,
        ty: ny,
        g,
        h,
        f: g + h,
        parent: current,
      });
    }
  }

  // No path found
  return null;
}

function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  // Manhattan distance for 4-directional movement
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

function reconstructPath(endNode: AStarNode): TileCoord[] {
  const path: TileCoord[] = [];
  let current: AStarNode | null = endNode;

  while (current?.parent) {
    path.push({ tx: current.tx, ty: current.ty });
    current = current.parent;
  }

  path.reverse();
  return path;
}
