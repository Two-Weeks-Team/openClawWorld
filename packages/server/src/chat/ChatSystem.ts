import type { ChatChannel, ChatMessage } from '@openclawworld/shared';
import { parseEmotes } from '@openclawworld/shared';
import crypto from 'crypto';
import type { SafetyService } from '../services/SafetyService.js';

export type TeamMembershipCheck = (entityId: string, teamId: string) => boolean;
export type MeetingParticipationCheck = (entityId: string, meetingRoomId: string) => boolean;

export class ChatSystem {
  private messages: ChatMessage[] = [];
  private maxSize: number;
  private safetyService: SafetyService | null = null;
  private teamMembershipCheck: TeamMembershipCheck | null = null;
  private meetingParticipationCheck: MeetingParticipationCheck | null = null;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  setTeamMembershipCheck(check: TeamMembershipCheck): void {
    this.teamMembershipCheck = check;
  }

  setMeetingParticipationCheck(check: MeetingParticipationCheck): void {
    this.meetingParticipationCheck = check;
  }

  setSafetyService(safetyService: SafetyService): void {
    this.safetyService = safetyService;
  }

  /**
   * Send a message and store it in the chat system.
   * @param roomId - The room ID
   * @param channel - The chat channel (proximity/global/team/meeting/dm)
   * @param fromEntityId - The entity ID of the sender
   * @param fromName - The display name of the sender
   * @param message - The message content
   * @param options - Additional options for extended channels
   * @returns The generated message ID and timestamp, or null if validation fails
   */
  sendMessage(
    roomId: string,
    channel: ChatChannel,
    fromEntityId: string,
    fromName: string,
    message: string,
    options?: {
      targetEntityId?: string;
      teamId?: string;
      meetingRoomId?: string;
    }
  ): { messageId: string; tsMs: number } | null {
    if (channel === 'team' && options?.teamId && this.teamMembershipCheck) {
      if (!this.teamMembershipCheck(fromEntityId, options.teamId)) {
        return null;
      }
    }

    if (channel === 'meeting' && options?.meetingRoomId && this.meetingParticipationCheck) {
      if (!this.meetingParticipationCheck(fromEntityId, options.meetingRoomId)) {
        return null;
      }
    }

    if (channel === 'dm' && !options?.targetEntityId) {
      return null;
    }

    const tsMs = Date.now();
    const messageId = this.generateMessageId();
    const emotes = parseEmotes(message);

    const chatMessage: ChatMessage = {
      id: messageId,
      roomId,
      channel,
      fromEntityId,
      fromName,
      message,
      tsMs,
      targetEntityId: options?.targetEntityId,
      teamId: options?.teamId,
      meetingRoomId: options?.meetingRoomId,
      emotes: emotes.length > 0 ? emotes : undefined,
    };

    if (this.messages.length >= this.maxSize) {
      const removeCount = Math.ceil(this.maxSize * 0.1);
      this.messages.splice(0, removeCount);
    }

    this.messages.push(chatMessage);

    return { messageId, tsMs };
  }

  getMessages(roomId: string, channel?: ChatChannel, windowSec?: number): ChatMessage[] {
    const cutoffTime = windowSec ? Date.now() - windowSec * 1000 : 0;

    return this.messages.filter(msg => {
      if (msg.roomId !== roomId) return false;
      if (channel && msg.channel !== channel) return false;
      if (windowSec && msg.tsMs < cutoffTime) return false;
      return true;
    });
  }

  getMessagesForEntity(
    roomId: string,
    viewerId: string,
    channel?: ChatChannel,
    windowSec?: number
  ): ChatMessage[] {
    const baseMessages = this.getMessages(roomId, channel, windowSec);

    return baseMessages.filter(msg => {
      if (msg.channel === 'dm' && msg.targetEntityId) {
        const isSender = msg.fromEntityId === viewerId;
        const isRecipient = msg.targetEntityId === viewerId;
        if (!isSender && !isRecipient) return false;
      }

      if (this.safetyService && this.safetyService.isBlockedEitherWay(viewerId, msg.fromEntityId)) {
        return false;
      }

      return true;
    });
  }

  isBlocked(senderId: string, receiverId: string): boolean {
    return this.safetyService?.isBlockedEitherWay(senderId, receiverId) ?? false;
  }

  /**
   * Generate a unique message ID.
   * Format: msg_<random>
   * Uses crypto.randomBytes for uniqueness.
   */
  private generateMessageId(): string {
    const randomBytes = crypto.randomBytes(8);
    return `msg_${randomBytes.toString('hex')}`;
  }

  /**
   * Get the number of messages currently stored.
   * @returns The message count
   */
  getSize(): number {
    return this.messages.length;
  }

  /**
   * Clear all messages.
   */
  clear(): void {
    this.messages = [];
  }
}
