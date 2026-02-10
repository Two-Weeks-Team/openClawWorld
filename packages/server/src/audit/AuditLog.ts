import { randomUUID } from 'crypto';

export type AuditEventType =
  | 'safety.report'
  | 'safety.block'
  | 'safety.unblock'
  | 'safety.mute'
  | 'safety.unmute'
  | 'org.create'
  | 'org.delete'
  | 'org.member.add'
  | 'org.member.remove'
  | 'org.member.role_change'
  | 'meeting.create'
  | 'meeting.join'
  | 'meeting.leave'
  | 'meeting.vote.create'
  | 'meeting.vote.cast'
  | 'meeting.vote.close';

export interface AuditEntry {
  id: string;
  timestamp: number;
  type: AuditEventType;
  actorId: string; // Who performed the action
  targetId?: string; // Who/what was affected
  roomId?: string; // Which room (if applicable)
  metadata: Record<string, unknown>; // Additional context
}

/**
 * Audit logging system for tracking safety and permission-sensitive actions.
 * Maintains a bounded ring buffer of audit entries.
 */
export class AuditLog {
  private entries: AuditEntry[] = [];
  private maxEntries: number = 10000;

  /**
   * Log a new audit entry.
   * @param type - The type of audit event
   * @param actorId - Who performed the action
   * @param metadata - Additional context (may include targetId, roomId, etc.)
   */
  log(type: AuditEventType, actorId: string, metadata: Record<string, unknown> = {}): void {
    const entry: AuditEntry = {
      id: randomUUID(),
      timestamp: Date.now(),
      type,
      actorId,
      targetId: metadata.targetId as string | undefined,
      roomId: metadata.roomId as string | undefined,
      metadata: { ...metadata },
    };

    // Remove targetId and roomId from metadata since they're stored at top level
    delete entry.metadata.targetId;
    delete entry.metadata.roomId;

    // Ring buffer: if at max capacity, remove oldest entries (10% at a time)
    if (this.entries.length >= this.maxEntries) {
      const removeCount = Math.ceil(this.maxEntries * 0.1);
      this.entries.splice(0, removeCount);
    }

    this.entries.push(entry);
  }

  /**
   * Get audit entries with optional filtering.
   * @param filter - Optional filters for type, actor, target, time range, and limit
   * @returns Filtered audit entries
   */
  getEntries(filter?: {
    type?: AuditEventType;
    actorId?: string;
    targetId?: string;
    since?: number;
    limit?: number;
  }): AuditEntry[] {
    let results = [...this.entries];

    if (filter?.type) {
      results = results.filter(e => e.type === filter.type);
    }

    if (filter?.actorId) {
      results = results.filter(e => e.actorId === filter.actorId);
    }

    if (filter?.targetId) {
      results = results.filter(e => e.targetId === filter.targetId);
    }

    if (filter?.since !== undefined) {
      results = results.filter(e => e.timestamp >= filter.since!);
    }

    if (filter?.limit !== undefined && filter.limit > 0) {
      results = results.slice(-filter.limit);
    }

    return results;
  }

  /**
   * Get the current state for persistence.
   * @returns Deep copy of all entries
   */
  getState(): AuditEntry[] {
    return this.entries.map(e => ({ ...e, metadata: { ...e.metadata } }));
  }

  /**
   * Load state from persisted entries.
   * @param entries - The entries to load
   */
  loadState(entries: AuditEntry[]): void {
    this.entries = [...entries];

    // Trim if exceeds max
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  /**
   * Clear all audit entries.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get the number of entries in the log.
   * @returns Entry count
   */
  getSize(): number {
    return this.entries.length;
  }

  /**
   * Get the maximum number of entries allowed.
   * @returns Max entries limit
   */
  getMaxEntries(): number {
    return this.maxEntries;
  }

  /**
   * Set the maximum number of entries (will trim if needed).
   * @param max - New maximum
   */
  setMaxEntries(max: number): void {
    this.maxEntries = max;
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }
}
