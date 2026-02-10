/**
 * OpenClawWorld Plugin Configuration
 *
 * Validates and manages plugin configuration settings.
 */

import { z } from 'zod';

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Zod schema for validating plugin configuration
 */
export const PluginConfigSchema = z.object({
  /** Base URL of the OpenClawWorld AIC API */
  baseUrl: z.string().url(),

  /** API key for authentication with the OpenClawWorld server */
  apiKey: z.string().optional(),

  /** Default room ID to join when not specified in tool calls */
  defaultRoomId: z
    .string()
    .regex(/^[a-zA-Z0-9._-]{1,64}$/, 'Invalid roomId format')
    .optional(),

  /** Default agent identifier for this plugin instance */
  defaultAgentId: z
    .string()
    .regex(/^[a-zA-Z0-9._-]{1,64}$/, 'Invalid agentId format')
    .optional(),

  /** Maximum retry attempts for retryable errors (0-10, default: 3) */
  retryMaxAttempts: z.number().int().min(0).max(10).default(3),

  /** Base delay in milliseconds for exponential backoff (100-5000, default: 500) */
  retryBaseDelayMs: z.number().int().min(100).max(5000).default(500),
});

/**
 * Plugin configuration type (input type - allows optional retry fields)
 */
export type PluginConfig = z.input<typeof PluginConfigSchema>;

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Retry settings for API calls
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;
}

/**
 * Get retry configuration from plugin config
 */
export function getRetryConfig(config: PluginConfig): RetryConfig {
  return {
    maxAttempts: config.retryMaxAttempts ?? 3,
    baseDelayMs: config.retryBaseDelayMs ?? 500,
  };
}

// ============================================================================
// Config Validation
// ============================================================================

/**
 * Validates and parses plugin configuration
 * @throws Error if configuration is invalid
 */
export function validateConfig(config: unknown): PluginConfig {
  const result = PluginConfigSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid plugin configuration:\n${issues.join('\n')}`);
  }

  return result.data;
}

/**
 * Safely validates plugin configuration without throwing
 */
export function validateConfigSafe(
  config: unknown
): { success: true; data: PluginConfig } | { success: false; error: string } {
  const result = PluginConfigSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    return { success: false, error: `Invalid plugin configuration:\n${issues.join('\n')}` };
  }

  return { success: true, data: result.data };
}
