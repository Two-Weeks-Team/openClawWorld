/**
 * MetricsCollector - Singleton class for collecting and tracking server metrics.
 *
 * Tracks:
 * - Server tick time (ms)
 * - Memory usage (MB)
 * - Event queue depth
 * - Connection count
 * - AIC requests/sec
 */

export interface ServerMetrics {
  /** Server tick time in milliseconds */
  tickTimeMs: number;
  /** Memory usage in MB */
  memoryUsageMB: number;
  /** Event queue depth (number of pending events) */
  eventQueueDepth: number;
  /** Current connection count */
  connectionCount: number;
  /** AIC requests per second */
  aicRequestsPerSec: number;
  /** Timestamp when metrics were recorded */
  timestamp: number;
}

export interface MetricsSnapshot {
  /** Current metrics values */
  current: ServerMetrics;
  /** Average tick time over the last minute */
  avgTickTimeMs: number;
  /** Peak memory usage in MB */
  peakMemoryUsageMB: number;
  /** Total AIC requests processed */
  totalAicRequests: number;
  /** Server uptime in seconds */
  uptimeSeconds: number;
}

/**
 * Singleton metrics collector for tracking server performance.
 */
export class MetricsCollector {
  private static instance: MetricsCollector | null = null;

  private currentMetrics: ServerMetrics;
  private tickTimes: number[] = [];
  private readonly maxTickHistory = 120;
  private peakMemoryUsageMB = 0;
  private totalAicRequests = 0;
  private aicRequestTimestamps: number[] = [];
  private readonly aicWindowMs = 1000;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
    this.currentMetrics = this.createEmptyMetrics();
  }

  /**
   * Get the singleton instance of MetricsCollector.
   */
  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Reset the singleton instance (useful for testing).
   */
  public static resetInstance(): void {
    MetricsCollector.instance = null;
  }

  private createEmptyMetrics(): ServerMetrics {
    return {
      tickTimeMs: 0,
      memoryUsageMB: 0,
      eventQueueDepth: 0,
      connectionCount: 0,
      aicRequestsPerSec: 0,
      timestamp: Date.now(),
    };
  }

  /**
   * Record a server tick with its execution time.
   * @param tickTimeMs - Time taken for the tick in milliseconds
   */
  recordTick(tickTimeMs: number): void {
    this.currentMetrics.tickTimeMs = tickTimeMs;

    this.tickTimes.push(tickTimeMs);
    if (this.tickTimes.length > this.maxTickHistory) {
      this.tickTimes.shift();
    }

    this.updateMemoryUsage();
    this.updateAicRequestRate();

    this.currentMetrics.timestamp = Date.now();
  }

  /**
   * Update memory usage metric.
   */
  updateMemoryUsage(): void {
    const usage = process.memoryUsage();
    const memoryMB = Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
    this.currentMetrics.memoryUsageMB = memoryMB;

    if (memoryMB > this.peakMemoryUsageMB) {
      this.peakMemoryUsageMB = memoryMB;
    }
  }

  /**
   * Set the current event queue depth.
   * @param depth - Number of events in the queue
   */
  setEventQueueDepth(depth: number): void {
    this.currentMetrics.eventQueueDepth = depth;
  }

  /**
   * Set the current connection count.
   * @param count - Number of active connections
   */
  setConnectionCount(count: number): void {
    this.currentMetrics.connectionCount = count;
  }

  /**
   * Record an AIC request.
   */
  recordAicRequest(): void {
    this.totalAicRequests++;
    const now = Date.now();
    this.aicRequestTimestamps.push(now);

    const cutoff = now - this.aicWindowMs;
    while (this.aicRequestTimestamps.length > 0 && this.aicRequestTimestamps[0] < cutoff) {
      this.aicRequestTimestamps.shift();
    }

    this.currentMetrics.aicRequestsPerSec = this.aicRequestTimestamps.length;
  }

  private updateAicRequestRate(): void {
    const now = Date.now();
    const cutoff = now - this.aicWindowMs;

    while (this.aicRequestTimestamps.length > 0 && this.aicRequestTimestamps[0] < cutoff) {
      this.aicRequestTimestamps.shift();
    }

    this.currentMetrics.aicRequestsPerSec = this.aicRequestTimestamps.length;
  }

  /**
   * Calculate average tick time from history.
   */
  private calculateAvgTickTime(): number {
    if (this.tickTimes.length === 0) {
      return 0;
    }
    const sum = this.tickTimes.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.tickTimes.length) * 100) / 100;
  }

  /**
   * Get the current metrics snapshot.
   */
  getSnapshot(): MetricsSnapshot {
    this.updateMemoryUsage();
    this.updateAicRequestRate();

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      current: { ...this.currentMetrics },
      avgTickTimeMs: this.calculateAvgTickTime(),
      peakMemoryUsageMB: this.peakMemoryUsageMB,
      totalAicRequests: this.totalAicRequests,
      uptimeSeconds,
    };
  }

  /**
   * Get current metrics as a plain object for JSON serialization.
   */
  getMetricsJSON(): Record<string, unknown> {
    const snapshot = this.getSnapshot();
    return {
      tick: {
        currentMs: snapshot.current.tickTimeMs,
        avgMs: snapshot.avgTickTimeMs,
      },
      memory: {
        currentMB: snapshot.current.memoryUsageMB,
        peakMB: snapshot.peakMemoryUsageMB,
      },
      events: {
        queueDepth: snapshot.current.eventQueueDepth,
      },
      connections: {
        current: snapshot.current.connectionCount,
      },
      aic: {
        requestsPerSec: snapshot.current.aicRequestsPerSec,
        totalRequests: snapshot.totalAicRequests,
      },
      uptime: {
        seconds: snapshot.uptimeSeconds,
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * Convenience function to get the metrics collector instance.
 */
export function getMetricsCollector(): MetricsCollector {
  return MetricsCollector.getInstance();
}
