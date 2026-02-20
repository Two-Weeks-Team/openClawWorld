/**
 * NeedsSystem - Maslow needs hierarchy for behavior motivation
 *
 * Needs decay over time, creating motivation for specific behaviors.
 * Different zones and actions satisfy different needs.
 */

import type { NeedsState } from '../types/agent.types.js';
import { chmodSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DECAY_PER_TICK: Record<keyof NeedsState, number> = {
  physiological: 0.008,
  safety: 0.003,
  belonging: 0.006,
  esteem: 0.004,
  selfActualization: 0.005,
};

/** What zone visits satisfy */
const ZONE_SATISFACTION: Record<string, Partial<NeedsState>> = {
  'lounge-cafe': { physiological: 0.3, belonging: 0.1 },
  lobby: { safety: 0.2 },
  office: { esteem: 0.2, safety: 0.1 },
  meeting: { belonging: 0.2, esteem: 0.15 },
  'central-park': { selfActualization: 0.15, physiological: 0.1 },
  arcade: { selfActualization: 0.2, physiological: 0.05 },
  plaza: { belonging: 0.15, selfActualization: 0.1 },
  lake: { physiological: 0.1, selfActualization: 0.15 },
};

/** What actions satisfy */
const ACTION_SATISFACTION: Record<string, Partial<NeedsState>> = {
  chat: { belonging: 0.15, esteem: 0.05 },
  interact: { esteem: 0.1, selfActualization: 0.1 },
  explore: { selfActualization: 0.2 },
  rest: { physiological: 0.15, safety: 0.1 },
};

export class NeedsSystem {
  private state: NeedsState;
  private readonly persistPath: string | null;

  constructor(persistPath?: string) {
    this.persistPath = persistPath ?? null;
    this.state = { physiological: 1, safety: 1, belonging: 1, esteem: 1, selfActualization: 1 };
    this.load();
  }

  getState(): NeedsState {
    return { ...this.state };
  }

  /** Decay all needs (called each tick) */
  decay(): void {
    for (const key of Object.keys(DECAY_PER_TICK) as Array<keyof NeedsState>) {
      this.state[key] = Math.max(0, this.state[key] - DECAY_PER_TICK[key]);
    }
  }

  /** Satisfy needs from a zone visit */
  satisfyFromZone(zoneId: string): void {
    const sat = ZONE_SATISFACTION[zoneId];
    if (!sat) return;
    this.applySatisfaction(sat);
  }

  /** Satisfy needs from an action */
  satisfyFromAction(actionType: string): void {
    const sat = ACTION_SATISFACTION[actionType];
    if (!sat) return;
    this.applySatisfaction(sat);
  }

  /** Get the most urgent need (lowest value) */
  getMostUrgentNeed(): { need: keyof NeedsState; value: number } {
    let lowest: keyof NeedsState = 'physiological';
    let lowestValue = this.state.physiological;

    for (const key of Object.keys(this.state) as Array<keyof NeedsState>) {
      if (this.state[key] < lowestValue) {
        lowestValue = this.state[key];
        lowest = key;
      }
    }

    return { need: lowest, value: lowestValue };
  }

  /** Suggest a zone based on most urgent need */
  suggestZone(): string | null {
    const { need } = this.getMostUrgentNeed();

    const zoneScores: Array<{ zone: string; score: number }> = [];
    for (const [zone, sat] of Object.entries(ZONE_SATISFACTION)) {
      const satisfaction = (sat as Record<string, number>)[need] ?? 0;
      if (satisfaction > 0) {
        zoneScores.push({ zone, score: satisfaction });
      }
    }

    if (zoneScores.length === 0) return null;
    zoneScores.sort((a, b) => b.score - a.score);
    return zoneScores[0]!.zone;
  }

  save(): void {
    if (!this.persistPath) return;
    const dir = dirname(this.persistPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
    chmodSync(dir, 0o700);
    writeFileSync(this.persistPath, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    chmodSync(this.persistPath, 0o600);
  }

  private load(): void {
    if (!this.persistPath || !existsSync(this.persistPath)) return;
    try {
      const raw = readFileSync(this.persistPath, 'utf-8');
      const data = JSON.parse(raw) as NeedsState;
      this.state = data;
    } catch {
      // Use defaults
    }
  }

  private applySatisfaction(sat: Partial<NeedsState>): void {
    for (const [key, value] of Object.entries(sat)) {
      const k = key as keyof NeedsState;
      this.state[k] = Math.min(1, this.state[k] + (value ?? 0));
    }
  }
}
