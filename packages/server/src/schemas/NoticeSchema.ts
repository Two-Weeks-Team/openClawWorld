import { Schema, type } from '@colyseus/schema';

export class NoticeSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  teamId: string = '';

  @type('string')
  title: string = '';

  @type('string')
  content: string = '';

  @type('string')
  authorId: string = '';

  @type('number')
  createdAt: number = 0;

  @type('boolean')
  pinned: boolean = false;

  constructor(
    id?: string,
    teamId?: string,
    title?: string,
    content?: string,
    authorId?: string,
    pinned?: boolean
  ) {
    super();
    if (id !== undefined) this.id = id;
    if (teamId !== undefined) this.teamId = teamId;
    if (title !== undefined) this.title = title;
    if (content !== undefined) this.content = content;
    if (authorId !== undefined) this.authorId = authorId;
    this.createdAt = Date.now();
    if (pinned !== undefined) this.pinned = pinned;
  }
}
