/**
 * Server-wide constants for game mechanics.
 */

/**
 * Default proximity detection radius in world units.
 * Entities within this distance are considered in proximity.
 */
export const DEFAULT_PROXIMITY_RADIUS = 100;

/**
 * Debounce time in milliseconds for proximity events.
 * Prevents rapid enter/exit event flapping when entities hover near the radius boundary.
 */
export const PROXIMITY_DEBOUNCE_MS = 500;

/**
 * Event log retention time in milliseconds (5 minutes).
 * Events older than this will be cleaned up.
 */
export const EVENT_RETENTION_MS = 300000;

/**
 * Maximum number of events to keep in the event log (ring buffer size).
 * When exceeded, oldest events are removed.
 */
export const EVENT_LOG_MAX_SIZE = 10000;

/**
 * Default limit for event queries.
 */
export const EVENT_DEFAULT_LIMIT = 50;

/**
 * Default movement speed in pixels per second.
 */
export const DEFAULT_MOVE_SPEED = 100;

/**
 * Maximum movement speed in pixels per second.
 */
export const MAX_MOVE_SPEED = 200;

/**
 * Default tile size in pixels.
 */
export const DEFAULT_TILE_SIZE = 32;

/**
 * Default spawn position (plaza center) for entities when no spawn point is configured.
 */
export const DEFAULT_SPAWN_POSITION = {
  x: 1024,
  y: 1024,
} as const;
