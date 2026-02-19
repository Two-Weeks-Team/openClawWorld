/**
 * WorkingMemory - Current tick context (RAM-only)
 *
 * Holds ephemeral state for the current cognitive cycle.
 * Reset/updated each tick from perception results.
 */

import type { WorkingMemoryState } from '../types/memory.types.js';

export class WorkingMemory {
  private state: WorkingMemoryState;

  constructor() {
    this.state = this.createEmpty();
  }

  getState(): WorkingMemoryState {
    return { ...this.state };
  }

  updatePosition(x: number, y: number, zone: string | null): void {
    const changed =
      this.state.currentPosition.x !== x ||
      this.state.currentPosition.y !== y ||
      this.state.currentZone !== zone;

    this.state.currentPosition = { x, y };
    this.state.currentZone = zone;

    if (changed) {
      this.state.ticksSinceLastChange = 0;
    } else {
      this.state.ticksSinceLastChange++;
    }
  }

  updateNearby(
    entities: Array<{ id: string; name: string; kind: string; distance: number }>,
    facilities: Array<{ id: string; type: string; name: string; distance: number }>
  ): void {
    this.state.nearbyEntities = entities;
    this.state.nearbyFacilities = facilities;
  }

  addEvent(type: string, summary: string): void {
    this.state.recentEvents.push({ type, timestamp: Date.now(), summary });
    // Keep last 20 events
    if (this.state.recentEvents.length > 20) {
      this.state.recentEvents = this.state.recentEvents.slice(-20);
    }
  }

  addPendingMessage(from: string, message: string, channel: string): void {
    this.state.pendingMessages.push({ from, message, channel, timestamp: Date.now() });
    // Keep last 10
    if (this.state.pendingMessages.length > 10) {
      this.state.pendingMessages = this.state.pendingMessages.slice(-10);
    }
  }

  consumePendingMessages(): Array<{
    from: string;
    message: string;
    channel: string;
    timestamp: number;
  }> {
    const messages = [...this.state.pendingMessages];
    this.state.pendingMessages = [];
    return messages;
  }

  setLastAction(action: string, result: string): void {
    this.state.lastAction = action;
    this.state.lastActionResult = result;
  }

  setActiveGoal(goal: string | null): void {
    this.state.activeGoal = goal;
  }

  isIdle(): boolean {
    return (
      this.state.ticksSinceLastChange > 3 &&
      this.state.pendingMessages.length === 0 &&
      this.state.recentEvents.length === 0
    );
  }

  private createEmpty(): WorkingMemoryState {
    return {
      currentZone: null,
      currentPosition: { x: 0, y: 0 },
      nearbyEntities: [],
      nearbyFacilities: [],
      recentEvents: [],
      pendingMessages: [],
      activeGoal: null,
      lastAction: null,
      lastActionResult: null,
      ticksSinceLastChange: 0,
    };
  }
}
