import type { EventEnvelope, EventType } from '@openclawworld/shared';

/**
 * Ring buffer implementation for storing events with bounded memory usage.
 * Events are stored with cursors that are monotonically increasing.
 */
export class EventLog {
  private retentionMs: number;
  private maxSize: number;
  private events: EventEnvelope[] = [];
  private cursorSequence = 0;
  private readonly epochStart: number;

  /**
   * Create a new EventLog.
   * @param retentionMs - How long to keep events before they can be cleaned up
   * @param maxSize - Maximum number of events to keep (ring buffer size)
   */
  constructor(retentionMs: number, maxSize: number) {
    this.retentionMs = retentionMs;
    this.maxSize = maxSize;
    // Use current timestamp as epoch to ensure cursors are increasing even after restart
    this.epochStart = Date.now();
  }

  /**
   * Append a new event to the log.
   * @param type - The event type
   * @param roomId - The room ID
   * @param payload - The event payload
   * @returns The cursor for the newly created event
   */
  append(type: EventType, roomId: string, payload: unknown): string {
    const tsMs = Date.now();
    const cursor = this.generateCursor(tsMs);

    const event: EventEnvelope = {
      cursor,
      type,
      roomId,
      tsMs,
      payload: payload as Record<string, unknown>,
    };

    // Ring buffer: if full, remove oldest events
    if (this.events.length >= this.maxSize) {
      const removeCount = Math.ceil(this.maxSize * 0.1); // Remove 10% when full
      this.events.splice(0, removeCount);
    }

    this.events.push(event);
    return cursor;
  }

  /**
   * Get events since a given cursor, up to a limit.
   * @param cursor - The cursor to start from (exclusive)
   * @param limit - Maximum number of events to return
   * @returns Object containing events and the next cursor
   */
  getSince(
    cursor: string,
    limit: number
  ): { events: EventEnvelope[]; nextCursor: string; cursorExpired: boolean } {
    // Find the index of the event with the given cursor
    const index = this.events.findIndex(e => e.cursor === cursor);

    let startIndex: number;
    let cursorExpired = false;
    if (index === -1) {
      if (this.events.length === 0) {
        // Event log is empty - cursor is a synthetic bootstrap cursor, not expired
        startIndex = 0;
        cursorExpired = false;
      } else {
        // Decode sequences to determine if cursor is ahead of (bootstrap) or behind (expired) events
        const givenSeq = this.decodeCursorSequence(cursor);
        const newestSeq = this.decodeCursorSequence(this.events[this.events.length - 1].cursor);
        if (givenSeq !== null && newestSeq !== null && givenSeq > newestSeq) {
          // Cursor is newer than all events - bootstrap cursor that hasn't seen any events yet
          startIndex = this.events.length;
          cursorExpired = false;
        } else {
          // Cursor was evicted from ring buffer - genuine expiry
          startIndex = this.events.length;
          cursorExpired = true;
        }
      }
    } else {
      // Start after the found cursor
      startIndex = index + 1;
    }

    const endIndex = Math.min(startIndex + limit, this.events.length);
    const events = this.events.slice(startIndex, endIndex);
    // When cursorExpired, return getCurrentCursor() so clients get a usable cursor even
    // without reading the cursorExpired flag (prevents infinite stale-cursor loops)
    const nextCursor =
      events.length > 0
        ? events[events.length - 1].cursor
        : cursorExpired
          ? this.getCurrentCursor()
          : cursor;

    return { events, nextCursor, cursorExpired };
  }

  /**
   * Decode the sequence number from a cursor string.
   * Returns null if the cursor cannot be decoded.
   */
  private decodeCursorSequence(cursor: string): number | null {
    try {
      // Convert base64url back to standard base64
      const base64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      const parts = decoded.split('_');
      if (parts.length !== 2) return null;
      return parseInt(parts[1], 36);
    } catch {
      return null;
    }
  }

  /**
   * Get the current cursor (latest event's cursor, or a new one if empty).
   * @returns The current cursor
   */
  getCurrentCursor(): string {
    if (this.events.length === 0) {
      // Return a cursor that represents "now" - any new events will have higher cursors
      return this.generateCursor(Date.now());
    }
    return this.events[this.events.length - 1].cursor;
  }

  /**
   * Clean up expired events older than retentionMs.
   * @returns Number of events removed
   */
  cleanup(): number {
    const cutoffTime = Date.now() - this.retentionMs;

    // Remove events older than retention period
    // Since events are ordered by cursor (and cursor includes timestamp), they are chronologically ordered
    let removeCount = 0;
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].tsMs < cutoffTime) {
        removeCount++;
      } else {
        break; // Events are ordered, so we can stop here
      }
    }

    if (removeCount > 0) {
      this.events.splice(0, removeCount);
    }

    return removeCount;
  }

  /**
   * Get the number of events currently stored.
   * @returns The event count
   */
  getSize(): number {
    return this.events.length;
  }

  /**
   * Generate a monotonically increasing cursor.
   * Format: base64url(<timestamp>_<sequence>)
   * This ensures cursors are sortable and unique even after restart.
   */
  private generateCursor(timestamp: number): string {
    this.cursorSequence++;
    // Include epoch offset to ensure uniqueness across restarts
    const effectiveTime = timestamp - this.epochStart;
    const rawCursor = `${effectiveTime.toString(36)}_${this.cursorSequence.toString(36)}`;
    return this.base64UrlEncode(rawCursor);
  }

  /**
   * Encode a string to base64url format.
   * Base64url replaces '+' with '-', '/' with '_', and removes padding '='.
   * This matches the pattern: ^[A-Za-z0-9=_-]{1,256}$
   */
  private base64UrlEncode(str: string): string {
    // Use Buffer for Node.js environment
    const base64 = Buffer.from(str, 'utf8').toString('base64');
    // Convert to base64url: replace + with -, / with _, remove padding
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}
