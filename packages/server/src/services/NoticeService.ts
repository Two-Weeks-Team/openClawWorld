import { RoomState } from '../schemas/RoomState.js';
import { NoticeSchema } from '../schemas/NoticeSchema.js';
import { randomUUID } from 'crypto';

export interface Notice {
  id: string;
  teamId: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: number;
  pinned: boolean;
}

export class NoticeService {
  private notices: Map<string, Notice[]> = new Map();

  constructor(private state: RoomState) {}

  createNotice(teamId: string, title: string, content: string, authorId: string): Notice {
    const notice: Notice = {
      id: randomUUID(),
      teamId,
      title,
      content,
      authorId,
      createdAt: Date.now(),
      pinned: false,
    };

    const teamNotices = this.notices.get(teamId) ?? [];
    teamNotices.push(notice);
    this.notices.set(teamId, teamNotices);

    const noticeSchema = new NoticeSchema(
      notice.id,
      notice.teamId,
      notice.title,
      notice.content,
      notice.authorId,
      notice.pinned
    );
    noticeSchema.createdAt = notice.createdAt;
    this.state.notices.set(notice.id, noticeSchema);

    return notice;
  }

  updateNotice(
    noticeId: string,
    updates: Partial<Omit<Notice, 'id' | 'teamId' | 'createdAt'>>
  ): Notice | null {
    const notice = this.getNotice(noticeId);
    if (!notice) return null;

    Object.assign(notice, updates);

    const noticeSchema = this.state.notices.get(noticeId);
    if (noticeSchema) {
      if (updates.title !== undefined) noticeSchema.title = updates.title;
      if (updates.content !== undefined) noticeSchema.content = updates.content;
      if (updates.authorId !== undefined) noticeSchema.authorId = updates.authorId;
      if (updates.pinned !== undefined) noticeSchema.pinned = updates.pinned;
    }

    return notice;
  }

  deleteNotice(noticeId: string): boolean {
    const notice = this.getNotice(noticeId);
    if (!notice) return false;

    const teamNotices = this.notices.get(notice.teamId) ?? [];
    const index = teamNotices.findIndex(n => n.id === noticeId);
    if (index === -1) return false;

    teamNotices.splice(index, 1);
    if (teamNotices.length === 0) {
      this.notices.delete(notice.teamId);
    } else {
      this.notices.set(notice.teamId, teamNotices);
    }

    this.state.notices.delete(noticeId);

    return true;
  }

  pinNotice(noticeId: string, pinned: boolean): boolean {
    const notice = this.getNotice(noticeId);
    if (!notice) return false;

    notice.pinned = pinned;

    const noticeSchema = this.state.notices.get(noticeId);
    if (noticeSchema) {
      noticeSchema.pinned = pinned;
    }

    return true;
  }

  getNotices(teamId: string): Notice[] {
    const teamNotices = this.notices.get(teamId) ?? [];

    return [...teamNotices].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }

  getNotice(noticeId: string): Notice | null {
    for (const teamNotices of this.notices.values()) {
      const notice = teamNotices.find(n => n.id === noticeId);
      if (notice) return notice;
    }
    return null;
  }

  getState(): { notices: Record<string, Notice[]> } {
    const state: Record<string, Notice[]> = {};
    this.notices.forEach((notices, teamId) => {
      state[teamId] = [...notices];
    });
    return { notices: state };
  }

  loadState(state: { notices: Record<string, Notice[]> }): void {
    this.notices.clear();
    this.state.notices.clear();

    for (const [teamId, notices] of Object.entries(state.notices)) {
      this.notices.set(teamId, [...notices]);

      for (const notice of notices) {
        const noticeSchema = new NoticeSchema(
          notice.id,
          notice.teamId,
          notice.title,
          notice.content,
          notice.authorId,
          notice.pinned
        );
        noticeSchema.createdAt = notice.createdAt;
        this.state.notices.set(notice.id, noticeSchema);
      }
    }
  }
}
