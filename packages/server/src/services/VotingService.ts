import { VoteSchema, VoteCastSchema } from '../schemas/VoteSchema.js';

export class VotingService {
  private votes: Map<string, VoteSchema> = new Map();
  private voteCounter = 0;

  createVote(
    meetingId: string,
    question: string,
    options: string[],
    anonymous: boolean,
    createdBy: string
  ): VoteSchema {
    const id = `vote_${++this.voteCounter}_${Date.now()}`;
    const vote = new VoteSchema({
      id,
      meetingId,
      question,
      anonymous,
      createdBy,
      createdAt: Date.now(),
    });

    options.forEach((text, index) => {
      vote.addOption({ text, order: index });
    });

    this.votes.set(id, vote);
    return vote;
  }

  startVote(voteId: string): VoteSchema | null {
    const vote = this.votes.get(voteId);
    if (!vote) {
      return null;
    }

    if (!vote.start()) {
      return null;
    }

    return vote;
  }

  closeVote(voteId: string): VoteSchema | null {
    const vote = this.votes.get(voteId);
    if (!vote) {
      return null;
    }

    if (!vote.close()) {
      return null;
    }

    return vote;
  }

  castVote(voteId: string, optionId: string, voterId: string): VoteCastSchema | null {
    const vote = this.votes.get(voteId);
    if (!vote) {
      return null;
    }

    if (!vote.isActive()) {
      return null;
    }

    if (!vote.hasOption(optionId)) {
      return null;
    }

    if (this.hasVoted(voteId, voterId)) {
      return null;
    }

    const castId = `cast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const cast = new VoteCastSchema({
      id: castId,
      optionId,
      voterId: vote.anonymous ? '' : voterId,
      castedAt: Date.now(),
    });

    vote.casts.set(castId, cast);
    return cast;
  }

  retractVote(voteId: string, voterId: string): boolean {
    const vote = this.votes.get(voteId);
    if (!vote) {
      return false;
    }

    if (!vote.isActive()) {
      return false;
    }

    if (vote.anonymous) {
      return false;
    }

    let castToRemove: string | null = null;
    vote.casts.forEach((cast, id) => {
      if (cast.voterId === voterId) {
        castToRemove = id;
      }
    });

    if (castToRemove) {
      vote.casts.delete(castToRemove);
      return true;
    }

    return false;
  }

  getVote(voteId: string): VoteSchema | undefined {
    return this.votes.get(voteId);
  }

  getVotesByMeeting(meetingId: string): VoteSchema[] {
    const result: VoteSchema[] = [];
    this.votes.forEach(vote => {
      if (vote.meetingId === meetingId) {
        result.push(vote);
      }
    });
    return result;
  }

  getResults(voteId: string): Map<string, number> | undefined {
    const vote = this.votes.get(voteId);
    if (!vote) {
      return undefined;
    }

    const results = new Map<string, number>();

    vote.options.forEach((_, optionId) => {
      results.set(optionId, 0);
    });

    vote.casts.forEach(cast => {
      const currentCount = results.get(cast.optionId) ?? 0;
      results.set(cast.optionId, currentCount + 1);
    });

    return results;
  }

  hasVoted(voteId: string, voterId: string): boolean {
    const vote = this.votes.get(voteId);
    if (!vote) {
      return false;
    }

    if (vote.anonymous) {
      return false;
    }

    let found = false;
    vote.casts.forEach(cast => {
      if (cast.voterId === voterId) {
        found = true;
      }
    });

    return found;
  }

  deleteVote(voteId: string): boolean {
    return this.votes.delete(voteId);
  }

  getAllVotes(): VoteSchema[] {
    return Array.from(this.votes.values());
  }
}
