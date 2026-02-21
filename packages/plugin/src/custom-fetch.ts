/**
 * Custom fetch wrapper for orval-generated API client.
 *
 * Provides retry logic with exponential backoff, authentication header
 * injection, and error handling consistent with the original manual client.
 *
 * orval calls this as: customFetch<T>(url, requestInit)
 * matching the standard fetch(url, init) signature.
 */
import type { AicResult } from '@openclawworld/shared';

// ============================================================================
// Configuration
// ============================================================================

export interface CustomFetchConfig {
  baseUrl: string;
  apiKey?: string;
  maxAttempts?: number;
  baseDelayMs?: number;
}

let globalConfig: CustomFetchConfig = {
  baseUrl: 'http://localhost:2567',
  maxAttempts: 3,
  baseDelayMs: 1000,
};

/**
 * Configure the custom fetch wrapper used by all generated API calls.
 * Must be called before making any API requests (typically in the
 * OpenClawWorldClient constructor).
 */
export function setFetchConfig(config: CustomFetchConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Returns the current fetch configuration (for testing/debugging).
 */
export function getFetchConfig(): Readonly<CustomFetchConfig> {
  return globalConfig;
}

// ============================================================================
// Retry Helpers
// ============================================================================

const RETRYABLE_ERROR_CODES = new Set(['room_not_ready', 'rate_limited', 'timeout', 'internal']);

function isRetryableErrorCode(code: string): boolean {
  return RETRYABLE_ERROR_CODES.has(code);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(attempt: number, baseDelayMs: number): number {
  return baseDelayMs * Math.pow(2, attempt - 1);
}

// ============================================================================
// Custom Fetcher
// ============================================================================

/**
 * Custom fetcher function compatible with orval's fetch client mutator.
 *
 * orval generates calls like:
 *   customFetch<ReturnType>(url, { method, headers, body, ...options })
 *
 * This function handles:
 * - Prepending the configured baseUrl to the relative path
 * - Adding auth headers (Bearer token)
 * - Retry with exponential backoff on retryable AIC errors
 * - Network error recovery
 */
export async function customFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const fullUrl = `${globalConfig.baseUrl.replace(/\/$/, '')}${url}`;
  const maxAttempts = globalConfig.maxAttempts ?? 3;
  const baseDelayMs = globalConfig.baseDelayMs ?? 1000;
  const method = init?.method ?? 'GET';

  let attempt = 1;
  while (true) {
    try {
      // Merge auth headers with provided headers
      const headers = new Headers(init?.headers);
      if (globalConfig.apiKey && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${globalConfig.apiKey}`);
      }

      const response = await fetch(fullUrl, {
        ...init,
        method,
        headers,
      });

      const responseData = (await response.json()) as AicResult<unknown>;

      // Handle HTTP errors with retryable AIC error responses
      if (!response.ok) {
        if (responseData.status === 'error' && responseData.error) {
          const retryable =
            responseData.error.retryable || isRetryableErrorCode(responseData.error.code);
          if (retryable && attempt < maxAttempts) {
            await sleep(calculateBackoff(attempt, baseDelayMs));
            attempt++;
            continue;
          }
          return responseData as T;
        }
        // Non-AIC error response
        return {
          status: 'error',
          error: {
            code: 'internal',
            message: `HTTP ${response.status}: ${response.statusText}`,
            retryable: true,
          },
        } as T;
      }

      // Handle successful HTTP but AIC-level errors (e.g., 200 with status: 'error')
      if (responseData.status === 'error' && responseData.error) {
        const retryable =
          responseData.error.retryable || isRetryableErrorCode(responseData.error.code);
        if (retryable && attempt < maxAttempts) {
          await sleep(calculateBackoff(attempt, baseDelayMs));
          attempt++;
          continue;
        }
      }

      return responseData as T;
    } catch (error) {
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('ECONNREFUSED'));

      if (isNetworkError && attempt < maxAttempts) {
        await sleep(calculateBackoff(attempt, baseDelayMs));
        attempt++;
        continue;
      }

      return {
        status: 'error',
        error: {
          code: 'internal',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: isNetworkError,
        },
      } as T;
    }
  }
}

export default customFetch;
