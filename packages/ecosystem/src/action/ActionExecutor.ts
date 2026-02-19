/**
 * ActionExecutor - Executes agent decisions via AIC API
 */

import type { OpenClawWorldClient } from '@openclawworld/plugin';
import type { AgentAction } from '../types/agent.types.js';
import { randomUUID } from 'crypto';

export type ActionResult = {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export class ActionExecutor {
  constructor(
    private readonly client: OpenClawWorldClient,
    private readonly agentId: string,
    private readonly roomId: string
  ) {}

  async execute(action: AgentAction): Promise<ActionResult> {
    switch (action.type) {
      case 'idle':
        return { success: true, message: 'Staying idle' };

      case 'moveTo':
        return this.executeMove(action.dest);

      case 'chat':
        return this.executeChat(action.channel, action.message);

      case 'interact':
        return this.executeInteract(action.targetId, action.action, action.params);

      case 'reflect':
        return { success: true, message: 'Reflecting internally' };

      case 'observe':
        return { success: true, message: `Observing: ${action.reason}` };
    }
  }

  private async executeMove(dest: { tx: number; ty: number }): Promise<ActionResult> {
    const txId = randomUUID();
    const result = await this.client.moveTo({
      agentId: this.agentId,
      roomId: this.roomId,
      txId,
      dest,
      mode: 'walk',
    });

    if (result.status === 'error') {
      return {
        success: false,
        message: `Move failed: ${result.error.message}`,
        details: { code: result.error.code, dest },
      };
    }

    return {
      success: result.data.result === 'accepted',
      message:
        result.data.result === 'accepted'
          ? `Moving to tile (${dest.tx}, ${dest.ty})`
          : `Move ${result.data.result}: tile (${dest.tx}, ${dest.ty})`,
      details: { result: result.data.result, dest },
    };
  }

  private async executeChat(
    channel: 'proximity' | 'global',
    message: string
  ): Promise<ActionResult> {
    const txId = randomUUID();
    const result = await this.client.chatSend({
      agentId: this.agentId,
      roomId: this.roomId,
      txId,
      channel,
      message,
    });

    if (result.status === 'error') {
      return {
        success: false,
        message: `Chat failed: ${result.error.message}`,
        details: { code: result.error.code },
      };
    }

    return {
      success: true,
      message: `Sent ${channel} message: "${message.slice(0, 50)}..."`,
      details: { chatMessageId: result.data.chatMessageId },
    };
  }

  private async executeInteract(
    targetId: string,
    action: string,
    params?: Record<string, unknown>
  ): Promise<ActionResult> {
    const txId = randomUUID();
    const result = await this.client.interact({
      agentId: this.agentId,
      roomId: this.roomId,
      txId,
      targetId,
      action,
      params,
    });

    if (result.status === 'error') {
      return {
        success: false,
        message: `Interact failed: ${result.error.message}`,
        details: { code: result.error.code, targetId, action },
      };
    }

    return {
      success: result.data.outcome.type === 'ok',
      message: result.data.outcome.message ?? `Interaction ${result.data.outcome.type}`,
      details: { outcome: result.data.outcome.type, targetId, action },
    };
  }
}
