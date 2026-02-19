/**
 * ChatComposer - Prepares chat messages with personality flavor
 *
 * Ensures messages fit within game constraints and reflect agent personality.
 */

const MAX_MESSAGE_LENGTH = 500;

export class ChatComposer {
  compose(rawMessage: string): string {
    let message = rawMessage.trim();

    // Truncate if too long
    if (message.length > MAX_MESSAGE_LENGTH) {
      message = message.slice(0, MAX_MESSAGE_LENGTH - 3) + '...';
    }

    return message;
  }
}
