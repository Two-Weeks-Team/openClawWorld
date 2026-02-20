import { Room, type Client } from 'colyseus';
import { MeetingRoomState, MeetingParticipant } from '../schemas/MeetingRoomState.js';
import { ChatSystem } from '../chat/ChatSystem.js';
import { EventLog } from '../events/EventLog.js';
import { EVENT_RETENTION_MS, EVENT_LOG_MAX_SIZE } from '../constants.js';
import type { MeetingRoomOptions, MeetingEventType } from '@openclawworld/shared';
import type { AgendaItemData } from '../schemas/AgendaSchema.js';
import { registerMeeting, unregisterMeeting } from '../aic/meetingRegistry.js';

const EMPTY_ROOM_TIMEOUT_MS = 30000;
const RECONNECTION_TIMEOUT_SEC = 20;

export interface MeetingJoinOptions {
  entityId: string;
  name: string;
}

export class MeetingRoom extends Room<{ state: MeetingRoomState }> {
  declare state: MeetingRoomState;
  private chatSystem: ChatSystem;
  private eventLog: EventLog;
  private clientEntities: Map<string, string> = new Map();
  private emptyRoomTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.chatSystem = new ChatSystem();
    this.eventLog = new EventLog(EVENT_RETENTION_MS, EVENT_LOG_MAX_SIZE);
  }

  override onCreate(options: MeetingRoomOptions): void {
    const { meetingId, orgId, name, hostId, capacity } = options;

    this.setState(new MeetingRoomState(meetingId, orgId, name, hostId, capacity));

    this.chatSystem.setMeetingParticipationCheck((entityId, meetingRoomId) => {
      return meetingRoomId === this.state.meetingId && this.state.hasParticipant(entityId);
    });

    this.onMessage('chat', (client, message: { message: string }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId) return;

      const participant = this.state.getParticipant(entityId);
      if (!participant) return;

      const result = this.chatSystem.sendMeetingMessage(
        this.state.meetingId,
        entityId,
        participant.name,
        message.message
      );

      if (result) {
        this.broadcast('chat', {
          from: participant.name,
          message: message.message,
          entityId: entityId,
          messageId: result.messageId,
          tsMs: result.tsMs,
        });
      }
    });

    this.onMessage('getChatHistory', (client, message: { limit?: number }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId) return;

      const participant = this.state.getParticipant(entityId);
      if (!participant) return;

      const history = this.chatSystem.getMeetingHistory(this.state.meetingId, message.limit);
      client.send('chatHistory', { messages: history });
    });

    this.onMessage('transfer_host', (client, message: { newHostId: string }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId || !this.state.isHost(entityId)) return;

      this.transferHost(message.newHostId);
    });

    this.onMessage('end_meeting', client => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId || !this.state.isHost(entityId)) return;

      this.endMeeting();
    });

    this.onMessage('agenda_add', (client, message: { item: AgendaItemData }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId) return;

      this.addAgendaItem(message.item, entityId);
    });

    this.onMessage(
      'agenda_update',
      (client, message: { itemId: string; updates: Partial<AgendaItemData> }) => {
        const entityId = this.clientEntities.get(client.sessionId);
        if (!entityId) return;

        this.updateAgendaItem(message.itemId, message.updates, entityId);
      }
    );

    this.onMessage('agenda_remove', (client, message: { itemId: string }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId) return;

      this.removeAgendaItem(message.itemId, entityId);
    });

    this.onMessage('agenda_complete', (client, message: { itemId: string }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId) return;

      this.completeAgendaItem(message.itemId, entityId);
    });

    this.onMessage('agenda_set_current', (client, message: { itemId: string }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId) return;

      this.setCurrentAgendaItem(message.itemId, entityId);
    });

    this.onMessage('agenda_next', client => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId) return;

      this.nextAgendaItem(entityId);
    });

    this.onMessage('agenda_reorder', (client, message: { itemIds: string[] }) => {
      const entityId = this.clientEntities.get(client.sessionId);
      if (!entityId) return;

      this.reorderAgendaItems(message.itemIds, entityId);
    });

    this.logEvent('meeting.created', {
      meetingId,
      orgId,
      name,
      hostId,
      capacity: this.state.capacity,
    });

    registerMeeting(meetingId, this.roomId);

    console.log(`[MeetingRoom] Created meeting "${name}" (${meetingId}) for org ${orgId}`);
  }

  override onJoin(client: Client, options: MeetingJoinOptions): void {
    const { entityId, name } = options;

    if (this.state.isFull()) {
      throw new Error('Meeting is at capacity');
    }

    const isHost = entityId === this.state.hostId;
    const role = isHost ? 'host' : 'participant';

    const added = this.state.addParticipant(entityId, name, role);
    if (!added) {
      throw new Error('Failed to join meeting');
    }

    this.clientEntities.set(client.sessionId, entityId);
    client.send('joinedMeeting', {
      meetingId: this.state.meetingId,
      role,
      participants: this.getParticipants(),
    });

    this.cancelEmptyRoomTimer();

    this.logEvent('meeting.participant_joined', {
      meetingId: this.state.meetingId,
      entityId,
      name,
      role,
    });

    this.broadcast('participantJoined', {
      entityId,
      name,
      role,
      participantCount: this.state.getParticipantCount(),
    });

    console.log(
      `[MeetingRoom] ${name} (${entityId}) joined meeting ${this.state.meetingId} as ${role}`
    );
  }

  override async onLeave(client: Client, code?: number): Promise<void> {
    const entityId = this.clientEntities.get(client.sessionId);
    const consented = code === undefined;

    if (entityId) {
      const participant = this.state.getParticipant(entityId);
      const wasHost = this.state.isHost(entityId);

      this.state.removeParticipant(entityId);
      this.clientEntities.delete(client.sessionId);

      this.logEvent('meeting.participant_left', {
        meetingId: this.state.meetingId,
        entityId,
        name: participant?.name ?? 'Unknown',
        reason: consented ? 'left' : 'disconnected',
      });

      this.broadcast('participantLeft', {
        entityId,
        name: participant?.name ?? 'Unknown',
        participantCount: this.state.getParticipantCount(),
      });

      if (wasHost && !this.state.isEmpty()) {
        this.autoTransferHost();
      }

      if (this.state.isEmpty()) {
        this.startEmptyRoomTimer();
      }

      console.log(
        `[MeetingRoom] ${participant?.name ?? entityId} left meeting ${this.state.meetingId}`
      );
    }

    if (!consented) {
      try {
        await this.allowReconnection(client, RECONNECTION_TIMEOUT_SEC);
        console.log(`[MeetingRoom] Client ${client.sessionId} reconnected`);
      } catch {
        console.log(`[MeetingRoom] Client ${client.sessionId} did not reconnect in time`);
      }
    }
  }

  override onDispose(): void {
    this.logEvent('meeting.ended', {
      meetingId: this.state.meetingId,
      duration: Date.now() - this.state.startedAt,
    });

    unregisterMeeting(this.state.meetingId);
    this.cancelEmptyRoomTimer();
    this.clientEntities.clear();

    console.log(`[MeetingRoom] Meeting ${this.state.meetingId} disposed`);
  }

  endMeeting(): void {
    this.broadcast('meetingEnded', {
      meetingId: this.state.meetingId,
      endedBy: this.state.hostId,
    });

    this.disconnect();
  }

  transferHost(newHostId: string): boolean {
    if (!this.state.hasParticipant(newHostId)) {
      return false;
    }

    const oldHostId = this.state.hostId;
    const success = this.state.setHost(newHostId);

    if (success) {
      this.logEvent('meeting.host_transferred', {
        meetingId: this.state.meetingId,
        oldHostId,
        newHostId,
      });

      this.broadcast('hostTransferred', {
        oldHostId,
        newHostId,
      });

      console.log(`[MeetingRoom] Host transferred from ${oldHostId} to ${newHostId}`);
    }

    return success;
  }

  getParticipants(): MeetingParticipant[] {
    return this.state.getAllParticipants();
  }

  getChatSystem(): ChatSystem {
    return this.chatSystem;
  }

  getEventLog(): EventLog {
    return this.eventLog;
  }

  addAgendaItem(data: AgendaItemData, entityId: string): string | null {
    if (!this.state.isHost(entityId)) {
      return null;
    }

    const itemId = this.state.agenda.addItem(data);

    this.broadcast('agenda_item_added', {
      itemId,
      item: this.state.agenda.getItem(itemId),
    });

    this.logEvent('agenda.item_added', {
      meetingId: this.state.meetingId,
      itemId,
      title: data.title,
      addedBy: entityId,
    });

    return itemId;
  }

  removeAgendaItem(itemId: string, entityId: string): boolean {
    if (!this.state.isHost(entityId)) {
      return false;
    }

    const result = this.state.agenda.removeItem(itemId);

    if (result) {
      this.broadcast('agenda_item_removed', { itemId });

      this.logEvent('agenda.item_removed', {
        meetingId: this.state.meetingId,
        itemId,
        removedBy: entityId,
      });
    }

    return result;
  }

  updateAgendaItem(itemId: string, updates: Partial<AgendaItemData>, entityId: string): boolean {
    if (!this.state.isHost(entityId)) {
      return false;
    }

    const result = this.state.agenda.updateItem(itemId, updates);

    if (result) {
      this.broadcast('agenda_item_updated', {
        itemId,
        updates,
      });

      this.logEvent('agenda.item_updated', {
        meetingId: this.state.meetingId,
        itemId,
        updates,
        updatedBy: entityId,
      });
    }

    return result;
  }

  completeAgendaItem(itemId: string, entityId: string): boolean {
    if (!this.state.isHost(entityId)) {
      return false;
    }

    const result = this.state.agenda.completeItem(itemId);

    if (result) {
      this.broadcast('agenda_item_completed', { itemId });

      this.logEvent('agenda.item_completed', {
        meetingId: this.state.meetingId,
        itemId,
        completedBy: entityId,
      });
    }

    return result;
  }

  setCurrentAgendaItem(itemId: string, entityId: string): boolean {
    if (!this.state.isHost(entityId)) {
      return false;
    }

    const result = this.state.agenda.setCurrentItem(itemId);

    if (result) {
      this.broadcast('agenda_current_item_set', {
        itemId,
        item: itemId ? this.state.agenda.getItem(itemId) : null,
      });

      this.logEvent('agenda.current_item_set', {
        meetingId: this.state.meetingId,
        itemId,
        setBy: entityId,
      });
    }

    return result;
  }

  nextAgendaItem(entityId: string): boolean {
    if (!this.state.isHost(entityId)) {
      return false;
    }

    const result = this.state.agenda.nextItem();

    if (result) {
      const currentItem = this.state.agenda.getCurrentItem();
      this.broadcast('agenda_next_item', {
        itemId: this.state.agenda.currentItemId,
        item: currentItem,
      });

      this.logEvent('agenda.next_item', {
        meetingId: this.state.meetingId,
        itemId: this.state.agenda.currentItemId,
        advancedBy: entityId,
      });
    }

    return result;
  }

  reorderAgendaItems(itemIds: string[], entityId: string): boolean {
    if (!this.state.isHost(entityId)) {
      return false;
    }

    const result = this.state.agenda.reorderItems(itemIds);

    if (result) {
      this.broadcast('agenda_items_reordered', {
        itemIds,
        items: this.state.agenda.getSortedItems(),
      });

      this.logEvent('agenda.items_reordered', {
        meetingId: this.state.meetingId,
        itemIds,
        reorderedBy: entityId,
      });
    }

    return result;
  }

  private autoTransferHost(): void {
    const participants = this.state.getAllParticipants();
    if (participants.length > 0) {
      const firstParticipant = participants[0];
      this.transferHost(firstParticipant.entityId);
    }
  }

  private startEmptyRoomTimer(): void {
    this.cancelEmptyRoomTimer();
    this.emptyRoomTimer = setTimeout(() => {
      console.log(`[MeetingRoom] Meeting ${this.state.meetingId} empty for too long, disposing`);
      this.disconnect();
    }, EMPTY_ROOM_TIMEOUT_MS);
  }

  private cancelEmptyRoomTimer(): void {
    if (this.emptyRoomTimer) {
      clearTimeout(this.emptyRoomTimer);
      this.emptyRoomTimer = null;
    }
  }

  private logEvent(type: MeetingEventType, payload: Record<string, unknown>): string {
    return this.eventLog.append(type as never, this.state.meetingId, payload);
  }
}
