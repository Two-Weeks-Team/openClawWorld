import type { ChatChannel, ChatMessage } from '@openclawworld/shared';
import crypto from 'crypto';

/**
 * Ring buffer implementation for storing chat messages with bounded memory usage.
 */
export class ChatSystem {
  private messages: ChatMessage[] = [];
  private maxSize: number;

  /**
   * Create a new ChatSystem.
   * @param maxSize - Maximum number of messages to keep (ring buffer size)
   */
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Send a message and store it in the chat system.
   * @param roomId - The room ID
   * @param channel - The chat channel (proximity/global)
   * @param fromEntityId - The entity ID of the sender
   * @param fromName - The display name of the sender
   * @param message - The message content
   * @returns The generated message ID and timestamp
   */
  sendMessage(
    roomId: string,
    channel: ChatChannel,
    fromEntityId: string,
    fromName: string,
    message: string
  ): { messageId: string; tsMs: number } {
    const tsMs = Date.now();
    const messageId = this.generateMessageId();

    const chatMessage: ChatMessage = {
      id: messageId,
      roomId,
      channel,
      fromEntityId,
      fromName,
      message,
      tsMs,
    };

    // Ring buffer: if full, remove oldest messages
    if (this.messages.length >= this.maxSize) {
      const removeCount = Math.ceil(this.maxSize * 0.1); // Remove 10% when full
      this.messages.splice(0, removeCount);
    }

    this.messages.push(chatMessage);

    return { messageId, tsMs };
  }

  /**
   * Get messages from the chat system, optionally filtered by room, channel, and time window.
   * @param roomId - The room ID to filter by
   * @param channel - Optional channel to filter by
   * @param windowSec - Time window in seconds (messages newer than now - windowSec)
   * @returns Array of matching messages
   */
  getMessages(roomId: string, channel?: ChatChannel, windowSec?: number): ChatMessage[] {
    const cutoffTime = windowSec ? Date.now() - windowSec * 1000 : 0;

    return this.messages.filter(msg => {
      // Filter by room
      if (msg.roomId !== roomId) {
        return false;
      }

      // Filter by channel if specified
      if (channel && msg.channel !== channel) {
        return false;
      }

      // Filter by time window if specified
      if (windowSec && msg.tsMs < cutoffTime) {
        return false;
      }

      return true;
    });
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
