/**
 * Idempotency Store for AIC requests
 *
 * Provides in-memory storage with TTL (600 seconds) to ensure idempotent
 * processing of agent requests. Key format: `{agentId}:{roomId}:{txId}`
 */

import type { AicErrorObject } from '@openclawworld/shared';

const DEFAULT_TTL_MS = 600 * 1000; // 600 seconds = 10 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000; // Cleanup every minute

export type IdempotencyResult<T> =
  | { status: 'new' }
  | { status: 'replay'; result: T }
  | { status: 'conflict'; error: AicErrorObject };

interface StoredEntry<T> {
  result: T;
  payloadHash: string;
  expiresAt: number;
}

export class IdempotencyStore<T> {
  private store: Map<string, StoredEntry<T>> = new Map();
  private ttlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
    this.startCleanupInterval();
  }

  /**
   * Check if a transaction has been processed before.
   * Returns:
   * - 'new': Transaction not seen before, safe to process
   * - 'replay': Transaction seen with same payload, return stored result
   * - 'conflict': Transaction seen with different payload, error
   */
  check(agentId: string, roomId: string, txId: string, payload: unknown): IdempotencyResult<T> {
    const key = this.makeKey(agentId, roomId, txId);
    const entry = this.store.get(key);

    if (!entry) {
      return { status: 'new' };
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return { status: 'new' };
    }

    const payloadHash = this.hashPayload(payload);

    if (entry.payloadHash !== payloadHash) {
      return {
        status: 'conflict',
        error: {
          code: 'conflict',
          message: `Transaction ${txId} already processed with different payload`,
          retryable: false,
        },
      };
    }

    return { status: 'replay', result: entry.result };
  }

  save(agentId: string, roomId: string, txId: string, payload: unknown, result: T): void {
    const key = this.makeKey(agentId, roomId, txId);
    const payloadHash = this.hashPayload(payload);

    this.store.set(key, {
      result,
      payloadHash,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Create the storage key from components.
   */
  private makeKey(agentId: string, roomId: string, txId: string): string {
    return `${agentId}:${roomId}:${txId}`;
  }

  /**
   * Create a simple hash of the payload for comparison.
   * Uses JSON.stringify for deterministic comparison.
   */
  private hashPayload(payload: unknown): string {
    try {
      return JSON.stringify(payload);
    } catch {
      return String(payload);
    }
  }

  /**
   * Clean up expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[IdempotencyStore] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Start the periodic cleanup interval.
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop the cleanup interval. Call this on shutdown.
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  /**
   * Get the number of stored entries (for debugging/monitoring).
   */
  size(): number {
    return this.store.size;
  }
}

// Global singleton instances for different response types
import type { MoveToResponseData, InteractResponseData } from '@openclawworld/shared';

export const moveToIdempotencyStore = new IdempotencyStore<MoveToResponseData>();
export const interactIdempotencyStore = new IdempotencyStore<InteractResponseData>();
