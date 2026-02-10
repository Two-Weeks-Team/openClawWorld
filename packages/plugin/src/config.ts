/**
 * OpenClawWorld Plugin Configuration
 *
 * Validates and manages plugin configuration settings.
 */

import { z } from 'zod';

// ============================================================================
// Configuration Schema
// ============================================================================

export const PluginConfigSchema = z.object({
  baseUrl: z.string().url(),
  apiKey: z.string().optional(),
  defaultRoomId: z
    .string()
    .regex(/^[a-zA-Z0-9._-]{1,64}$/, 'Invalid roomId format')
    .optional(),
  defaultAgentId: z
    .string()
    .regex(/^[a-zA-Z0-9._-]{1,64}$/, 'Invalid agentId format')
    .optional(),
  retryMaxAttempts: z.number().int().min(0).max(10).default(3),
  retryBaseDelayMs: z.number().int().min(100).max(5000).default(500),
  enabledTools: z.array(z.string()).optional(),
  deniedTools: z.array(z.string()).optional(),
});

/**
 * Plugin configuration type (input type - allows optional retry fields)
 */
export type PluginConfig = z.input<typeof PluginConfigSchema>;

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
}

export function getRetryConfig(config: PluginConfig): RetryConfig {
  return {
    maxAttempts: config.retryMaxAttempts ?? 3,
    baseDelayMs: config.retryBaseDelayMs ?? 500,
  };
}

// ============================================================================
// Config Validation
// ============================================================================

export function validateConfig(config: unknown): PluginConfig {
  const result = PluginConfigSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid plugin configuration:\n${issues.join('\n')}`);
  }

  return result.data;
}

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

// ============================================================================
// Tool Policy Configuration
// ============================================================================

export const REQUIRED_TOOLS = ['ocw.status', 'ocw.observe', 'ocw.poll_events'] as const;
export const OPTIONAL_TOOLS = ['ocw.move_to', 'ocw.interact', 'ocw.chat_send'] as const;

export type ToolName = (typeof REQUIRED_TOOLS)[number] | (typeof OPTIONAL_TOOLS)[number];

export function isToolEnabled(toolName: string, config: PluginConfig): boolean {
  if (REQUIRED_TOOLS.includes(toolName as (typeof REQUIRED_TOOLS)[number])) {
    return true;
  }

  if (config.deniedTools?.includes(toolName)) {
    return false;
  }

  if (config.enabledTools) {
    return config.enabledTools.includes(toolName);
  }

  return false;
}

export function createForbiddenError(toolName: string): {
  status: 'error';
  error: { code: 'forbidden'; message: string; retryable: false };
} {
  return {
    status: 'error' as const,
    error: {
      code: 'forbidden' as const,
      message: `Tool '${toolName}' is not enabled. Add it to enabledTools or remove it from deniedTools in your configuration.`,
      retryable: false,
    },
  };
}
