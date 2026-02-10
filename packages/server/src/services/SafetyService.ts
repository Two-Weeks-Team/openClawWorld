import type { SafetyReport, MutedUser } from '@openclawworld/shared';

/**
 * Safety service for user protection with report, block, and mute functionality.
 */
export class SafetyService {
  private reports: Map<string, SafetyReport> = new Map();
  private blocks: Map<string, Set<string>> = new Map();
  private mutes: Map<string, MutedUser[]> = new Map();

  /**
   * Report a user for inappropriate behavior.
   * @param reporterId - The entity ID of the reporter
   * @param targetId - The entity ID of the reported user
   * @param reason - The reason for the report
   * @returns The created safety report
   */
  reportUser(reporterId: string, targetId: string, reason: string): SafetyReport {
    const report: SafetyReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      reporterId,
      targetId,
      reason,
      createdAt: Date.now(),
      status: 'pending',
    };
    this.reports.set(report.id, report);
    return report;
  }

  /**
   * Block a user. The blocked user will not be able to communicate with the blocker.
   * @param blockerId - The entity ID of the blocker
   * @param targetId - The entity ID of the user to block
   */
  blockUser(blockerId: string, targetId: string): void {
    if (!this.blocks.has(blockerId)) {
      this.blocks.set(blockerId, new Set());
    }
    this.blocks.get(blockerId)!.add(targetId);
  }

  /**
   * Unblock a previously blocked user.
   * @param blockerId - The entity ID of the blocker
   * @param targetId - The entity ID of the user to unblock
   */
  unblockUser(blockerId: string, targetId: string): void {
    this.blocks.get(blockerId)?.delete(targetId);
  }

  /**
   * Check if a user has blocked another user.
   * @param blockerId - The entity ID of the potential blocker
   * @param targetId - The entity ID of the potentially blocked user
   * @returns true if targetId is blocked by blockerId
   */
  isBlocked(blockerId: string, targetId: string): boolean {
    return this.blocks.get(blockerId)?.has(targetId) ?? false;
  }

  /**
   * Check if either user has blocked the other.
   * @param entityA - First entity ID
   * @param entityB - Second entity ID
   * @returns true if either has blocked the other
   */
  isBlockedEitherWay(entityA: string, entityB: string): boolean {
    return this.isBlocked(entityA, entityB) || this.isBlocked(entityB, entityA);
  }

  /**
   * Mute a user within an organization.
   * @param orgId - The organization ID
   * @param mutedId - The entity ID to mute
   * @param mutedBy - The entity ID of the moderator
   * @param durationMs - Optional duration in milliseconds
   * @returns The created mute record
   */
  muteUser(orgId: string, mutedId: string, mutedBy: string, durationMs?: number): MutedUser {
    const mute: MutedUser = {
      orgId,
      mutedId,
      mutedBy,
      createdAt: Date.now(),
      expiresAt: durationMs ? Date.now() + durationMs : undefined,
    };

    if (!this.mutes.has(orgId)) {
      this.mutes.set(orgId, []);
    }

    this.mutes.set(
      orgId,
      this.mutes.get(orgId)!.filter(m => m.mutedId !== mutedId)
    );
    this.mutes.get(orgId)!.push(mute);

    return mute;
  }

  /**
   * Unmute a previously muted user.
   * @param orgId - The organization ID
   * @param mutedId - The entity ID to unmute
   */
  unmuteUser(orgId: string, mutedId: string): void {
    if (this.mutes.has(orgId)) {
      this.mutes.set(
        orgId,
        this.mutes.get(orgId)!.filter(m => m.mutedId !== mutedId)
      );
    }
  }

  /**
   * Check if a user is currently muted in an organization.
   * Automatically unmutes expired mutes.
   * @param orgId - The organization ID
   * @param entityId - The entity ID to check
   * @returns true if the entity is muted
   */
  isMuted(orgId: string, entityId: string): boolean {
    const mutes = this.mutes.get(orgId);
    if (!mutes) return false;

    const mute = mutes.find(m => m.mutedId === entityId);
    if (!mute) return false;

    if (mute.expiresAt && Date.now() > mute.expiresAt) {
      this.unmuteUser(orgId, entityId);
      return false;
    }

    return true;
  }

  /**
   * Get all reports, optionally filtered by status.
   * @param status - Optional status filter
   * @returns Array of safety reports
   */
  getReports(status?: 'pending' | 'reviewed' | 'resolved'): SafetyReport[] {
    const all = Array.from(this.reports.values());
    return status ? all.filter(r => r.status === status) : all;
  }

  /**
   * Get a report by ID.
   * @param reportId - The report ID
   * @returns The safety report or undefined
   */
  getReport(reportId: string): SafetyReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Update the status of a report.
   * @param reportId - The report ID
   * @param status - The new status
   * @returns true if the report was updated
   */
  updateReportStatus(reportId: string, status: 'pending' | 'reviewed' | 'resolved'): boolean {
    const report = this.reports.get(reportId);
    if (!report) return false;
    report.status = status;
    return true;
  }

  /**
   * Get all blocked user IDs for a blocker.
   * @param blockerId - The entity ID of the blocker
   * @returns Array of blocked entity IDs
   */
  getBlockedUsers(blockerId: string): string[] {
    return Array.from(this.blocks.get(blockerId) ?? []);
  }

  /**
   * Get all muted users in an organization.
   * @param orgId - The organization ID
   * @returns Array of muted users
   */
  getMutedUsers(orgId: string): MutedUser[] {
    return this.mutes.get(orgId) ?? [];
  }

  /**
   * Serialize the service state for persistence.
   * @returns The serializable state
   */
  getState(): {
    reports: SafetyReport[];
    blocks: [string, string[]][];
    mutes: [string, MutedUser[]][];
  } {
    return {
      reports: Array.from(this.reports.values()),
      blocks: Array.from(this.blocks.entries()).map(([k, v]) => [k, Array.from(v)]),
      mutes: Array.from(this.mutes.entries()),
    };
  }

  /**
   * Load state from a serialized format.
   * @param state - The serialized state
   */
  loadState(state: {
    reports: SafetyReport[];
    blocks: [string, string[]][];
    mutes: [string, MutedUser[]][];
  }): void {
    this.reports = new Map(state.reports.map(r => [r.id, r]));
    this.blocks = new Map(state.blocks.map(([k, v]) => [k, new Set(v)]));
    this.mutes = new Map(state.mutes);
  }

  /**
   * Clear all data (useful for testing).
   */
  clear(): void {
    this.reports.clear();
    this.blocks.clear();
    this.mutes.clear();
  }
}
