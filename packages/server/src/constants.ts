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
