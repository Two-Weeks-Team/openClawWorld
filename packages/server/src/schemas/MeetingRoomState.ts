import { Schema, type, MapSchema } from '@colyseus/schema';
import { AgendaSchema } from './AgendaSchema.js';

export type MeetingParticipantRole = 'host' | 'participant';

export class MeetingParticipant extends Schema {
  @type('string')
  entityId: string = '';

  @type('string')
  name: string = '';

  @type('string')
  role: MeetingParticipantRole = 'participant';

  @type('number')
  joinedAt: number = 0;

  constructor(entityId?: string, name?: string, role?: MeetingParticipantRole) {
    super();
    if (entityId !== undefined) this.entityId = entityId;
    if (name !== undefined) this.name = name;
    if (role !== undefined) this.role = role;
    this.joinedAt = Date.now();
  }
}

export const DEFAULT_MEETING_CAPACITY = 20;

export class MeetingRoomState extends Schema {
  @type('string')
  meetingId: string = '';

  @type('string')
  orgId: string = '';

  @type('string')
  name: string = '';

  @type('number')
  capacity: number = DEFAULT_MEETING_CAPACITY;

  @type('string')
  hostId: string = '';

  @type('number')
  startedAt: number = 0;

  @type({ map: MeetingParticipant })
  participants: MapSchema<MeetingParticipant> = new MapSchema<MeetingParticipant>();

  @type(AgendaSchema)
  agenda: AgendaSchema = new AgendaSchema();

  @type(Schema)
  whiteboard: Schema | null = null;

  @type(Schema)
  activeVote: Schema | null = null;

  constructor(
    meetingId?: string,
    orgId?: string,
    name?: string,
    hostId?: string,
    capacity?: number
  ) {
    super();
    if (meetingId !== undefined) this.meetingId = meetingId;
    if (orgId !== undefined) this.orgId = orgId;
    if (name !== undefined) this.name = name;
    if (hostId !== undefined) this.hostId = hostId;
    if (capacity !== undefined) this.capacity = capacity;
    this.startedAt = Date.now();
  }

  addParticipant(
    entityId: string,
    name: string,
    role: MeetingParticipantRole = 'participant'
  ): boolean {
    if (this.participants.size >= this.capacity) {
      return false;
    }
    if (this.participants.has(entityId)) {
      return false;
    }
    const participant = new MeetingParticipant(entityId, name, role);
    this.participants.set(entityId, participant);
    return true;
  }

  removeParticipant(entityId: string): boolean {
    return this.participants.delete(entityId);
  }

  getParticipant(entityId: string): MeetingParticipant | undefined {
    return this.participants.get(entityId);
  }

  hasParticipant(entityId: string): boolean {
    return this.participants.has(entityId);
  }

  getParticipantCount(): number {
    return this.participants.size;
  }

  isHost(entityId: string): boolean {
    return this.hostId === entityId;
  }

  setHost(entityId: string): boolean {
    if (!this.participants.has(entityId)) {
      return false;
    }
    const currentHost = this.participants.get(this.hostId);
    if (currentHost) {
      currentHost.role = 'participant';
    }

    const newHost = this.participants.get(entityId);
    if (newHost) {
      newHost.role = 'host';
      this.hostId = entityId;
      return true;
    }
    return false;
  }

  getAllParticipants(): MeetingParticipant[] {
    const result: MeetingParticipant[] = [];
    this.participants.forEach(participant => {
      result.push(participant);
    });
    return result;
  }

  isFull(): boolean {
    return this.participants.size >= this.capacity;
  }

  isEmpty(): boolean {
    return this.participants.size === 0;
  }
}
