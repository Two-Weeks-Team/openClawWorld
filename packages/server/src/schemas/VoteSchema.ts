import { Schema, MapSchema, type } from '@colyseus/schema';

export interface VoteOptionData {
  id?: string;
  text: string;
  order?: number;
}

export class VoteOptionSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  text: string = '';

  @type('number')
  order: number = 0;

  constructor(data?: VoteOptionData) {
    super();
    if (data) {
      if (data.id !== undefined) this.id = data.id;
      if (data.text !== undefined) this.text = data.text;
      if (data.order !== undefined) this.order = data.order;
    }
  }
}

export interface VoteCastData {
  id?: string;
  optionId: string;
  voterId?: string;
  castedAt?: number;
}

export class VoteCastSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  optionId: string = '';

  @type('string')
  voterId: string = '';

  @type('number')
  castedAt: number = 0;

  constructor(data?: VoteCastData) {
    super();
    if (data) {
      if (data.id !== undefined) this.id = data.id;
      if (data.optionId !== undefined) this.optionId = data.optionId;
      if (data.voterId !== undefined) this.voterId = data.voterId;
      if (data.castedAt !== undefined) this.castedAt = data.castedAt;
    }
  }
}

export interface VoteData {
  id?: string;
  meetingId?: string;
  question?: string;
  anonymous?: boolean;
  status?: string;
  createdBy?: string;
  createdAt?: number;
  closedAt?: number;
}

export class VoteSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  meetingId: string = '';

  @type('string')
  question: string = '';

  @type({ map: VoteOptionSchema })
  options = new MapSchema<VoteOptionSchema>();

  @type({ map: VoteCastSchema })
  casts = new MapSchema<VoteCastSchema>();

  @type('boolean')
  anonymous: boolean = false;

  @type('string')
  status: string = 'pending';

  @type('string')
  createdBy: string = '';

  @type('number')
  createdAt: number = 0;

  @type('number')
  closedAt: number = 0;

  constructor(data?: VoteData) {
    super();
    if (data) {
      if (data.id !== undefined) this.id = data.id;
      if (data.meetingId !== undefined) this.meetingId = data.meetingId;
      if (data.question !== undefined) this.question = data.question;
      if (data.anonymous !== undefined) this.anonymous = data.anonymous;
      if (data.status !== undefined) this.status = data.status;
      if (data.createdBy !== undefined) this.createdBy = data.createdBy;
      if (data.createdAt !== undefined) this.createdAt = data.createdAt;
      if (data.closedAt !== undefined) this.closedAt = data.closedAt;
    }
  }

  addOption(data: VoteOptionData): string {
    const id = data.id ?? this.generateOptionId();
    const order = data.order ?? this.options.size;
    const option = new VoteOptionSchema({ ...data, id, order });
    this.options.set(id, option);
    return id;
  }

  removeOption(optionId: string): boolean {
    if (!this.options.has(optionId)) {
      return false;
    }
    this.options.delete(optionId);
    this.reorderOptions();
    return true;
  }

  getOption(optionId: string): VoteOptionSchema | undefined {
    return this.options.get(optionId);
  }

  hasOption(optionId: string): boolean {
    return this.options.has(optionId);
  }

  getSortedOptions(): VoteOptionSchema[] {
    const options: VoteOptionSchema[] = [];
    this.options.forEach(option => options.push(option));
    return options.sort((a, b) => a.order - b.order);
  }

  getOptionCount(): number {
    return this.options.size;
  }

  start(): boolean {
    if (this.status !== 'pending') {
      return false;
    }
    this.status = 'active';
    return true;
  }

  close(): boolean {
    if (this.status !== 'active') {
      return false;
    }
    this.status = 'closed';
    this.closedAt = Date.now();
    return true;
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  isClosed(): boolean {
    return this.status === 'closed';
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  private generateOptionId(): string {
    return `option_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private reorderOptions(): void {
    const sortedOptions = this.getSortedOptions();
    sortedOptions.forEach((option, index) => {
      option.order = index;
    });
  }
}
