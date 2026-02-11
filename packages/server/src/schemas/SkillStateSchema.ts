import { Schema, type } from '@colyseus/schema';

/**
 * Per-action cooldown state for an entity.
 * Key in MapSchema: `${skillId}:${actionId}`
 */
export class SkillStateSchema extends Schema {
  @type('string')
  skillId: string = '';

  @type('string')
  actionId: string = '';

  @type('number')
  lastUsedTime: number = 0;

  @type('number')
  cooldownRemaining: number = 0;

  constructor(skillId?: string, actionId?: string) {
    super();
    if (skillId) this.skillId = skillId;
    if (actionId) this.actionId = actionId;
  }

  /**
   * Check if cooldown has elapsed
   */
  isReady(cooldownMs: number): boolean {
    return Date.now() - this.lastUsedTime >= cooldownMs;
  }

  /**
   * Mark action as used, starting cooldown
   */
  markUsed(): void {
    this.lastUsedTime = Date.now();
  }

  /**
   * Update cooldownRemaining for client sync
   */
  updateCooldownRemaining(cooldownMs: number): void {
    const elapsed = Date.now() - this.lastUsedTime;
    this.cooldownRemaining = Math.max(0, cooldownMs - elapsed);
  }
}
