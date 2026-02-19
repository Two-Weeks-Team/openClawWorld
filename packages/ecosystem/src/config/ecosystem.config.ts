/**
 * Ecosystem Configuration - Master settings for the living ecosystem
 */

export type EcosystemConfig = {
  /** openClawWorld server base URL */
  serverBaseUrl: string;
  /** Default room/channel to join */
  defaultRoomId: string;
  /** Anthropic API key for Claude */
  anthropicApiKey: string;
  /** Claude model to use */
  model: 'claude-sonnet-4-20250514';
  /** Agent tick interval in ms (4-8 seconds) */
  tickIntervalMs: number;
  /** Max tokens per LLM call */
  maxTokensPerCall: number;
  /** Whether to skip LLM on idle ticks */
  skipIdleTicks: boolean;
  /** Ticks between reflections */
  reflectionInterval: number;
  /** Heartbeat timeout in ms */
  heartbeatTimeoutMs: number;
  /** Agent spawn delay in ms */
  spawnDelayMs: number;
  /** Data directory for persistent storage */
  dataDir: string;
  /** Enable GitHub issue creation */
  enableIssueCreation: boolean;
  /** Maximum concurrent agents */
  maxAgents: number;
};

export function loadConfig(overrides?: Partial<EcosystemConfig>): EcosystemConfig {
  const config: EcosystemConfig = {
    serverBaseUrl: process.env['OCW_BASE_URL'] || 'http://localhost:2567/aic/v0.1',
    defaultRoomId: process.env['OCW_DEFAULT_ROOM'] || 'channel-1',
    anthropicApiKey: process.env['ANTHROPIC_API_KEY'] || '',
    model: 'claude-sonnet-4-20250514',
    tickIntervalMs: 6000,
    maxTokensPerCall: 1024,
    skipIdleTicks: true,
    reflectionInterval: 12,
    heartbeatTimeoutMs: 60_000,
    spawnDelayMs: 2000,
    dataDir: new URL('../../data/agents', import.meta.url).pathname,
    enableIssueCreation: true,
    maxAgents: 10,
    ...overrides,
  };

  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  return config;
}
