import { describe, it, expect, beforeEach } from 'vitest';
import {
  VoteSchema,
  VoteOptionSchema,
  VoteCastSchema,
  type VoteOptionData,
  type VoteCastData,
  type VoteData,
} from '../../packages/server/src/schemas/VoteSchema.js';
import { VotingService } from '../../packages/server/src/services/VotingService.js';

describe('VoteOptionSchema', () => {
  describe('constructor', () => {
    it('creates option with default values', () => {
      const option = new VoteOptionSchema();

      expect(option.id).toBe('');
      expect(option.text).toBe('');
      expect(option.order).toBe(0);
    });

    it('creates option with provided values', () => {
      const data: VoteOptionData = {
        id: 'opt_001',
        text: 'Option A',
        order: 1,
      };
      const option = new VoteOptionSchema(data);

      expect(option.id).toBe('opt_001');
      expect(option.text).toBe('Option A');
      expect(option.order).toBe(1);
    });

    it('creates option with partial data', () => {
      const data: VoteOptionData = {
        text: 'Partial Option',
      };
      const option = new VoteOptionSchema(data);

      expect(option.text).toBe('Partial Option');
      expect(option.id).toBe('');
      expect(option.order).toBe(0);
    });
  });
});

describe('VoteCastSchema', () => {
  describe('constructor', () => {
    it('creates cast with default values', () => {
      const cast = new VoteCastSchema();

      expect(cast.id).toBe('');
      expect(cast.optionId).toBe('');
      expect(cast.voterId).toBe('');
      expect(cast.castedAt).toBe(0);
    });

    it('creates cast with provided values', () => {
      const data: VoteCastData = {
        id: 'cast_001',
        optionId: 'opt_001',
        voterId: 'user_001',
        castedAt: 1234567890,
      };
      const cast = new VoteCastSchema(data);

      expect(cast.id).toBe('cast_001');
      expect(cast.optionId).toBe('opt_001');
      expect(cast.voterId).toBe('user_001');
      expect(cast.castedAt).toBe(1234567890);
    });

    it('creates anonymous cast with empty voterId', () => {
      const data: VoteCastData = {
        optionId: 'opt_001',
        voterId: '',
      };
      const cast = new VoteCastSchema(data);

      expect(cast.optionId).toBe('opt_001');
      expect(cast.voterId).toBe('');
    });
  });
});

describe('VoteSchema', () => {
  let vote: VoteSchema;

  beforeEach(() => {
    vote = new VoteSchema();
  });

  describe('constructor', () => {
    it('creates vote with default values', () => {
      expect(vote.id).toBe('');
      expect(vote.meetingId).toBe('');
      expect(vote.question).toBe('');
      expect(vote.options).toBeDefined();
      expect(vote.options.size).toBe(0);
      expect(vote.casts).toBeDefined();
      expect(vote.casts.size).toBe(0);
      expect(vote.anonymous).toBe(false);
      expect(vote.status).toBe('pending');
      expect(vote.createdBy).toBe('');
      expect(vote.createdAt).toBe(0);
      expect(vote.closedAt).toBe(0);
    });

    it('creates vote with provided values', () => {
      const data: VoteData = {
        id: 'vote_001',
        meetingId: 'meeting_001',
        question: 'Test Question?',
        anonymous: true,
        status: 'active',
        createdBy: 'user_001',
        createdAt: 1234567890,
        closedAt: 1234567899,
      };
      const v = new VoteSchema(data);

      expect(v.id).toBe('vote_001');
      expect(v.meetingId).toBe('meeting_001');
      expect(v.question).toBe('Test Question?');
      expect(v.anonymous).toBe(true);
      expect(v.status).toBe('active');
      expect(v.createdBy).toBe('user_001');
      expect(v.createdAt).toBe(1234567890);
      expect(v.closedAt).toBe(1234567899);
    });
  });

  describe('addOption', () => {
    it('adds option and returns ID', () => {
      const id = vote.addOption({ text: 'Option A' });

      expect(id).toBeDefined();
      expect(vote.options.size).toBe(1);
      expect(vote.hasOption(id)).toBe(true);
    });

    it('generates unique IDs for each option', () => {
      const id1 = vote.addOption({ text: 'Option 1' });
      const id2 = vote.addOption({ text: 'Option 2' });

      expect(id1).not.toBe(id2);
    });

    it('assigns sequential order by default', () => {
      vote.addOption({ text: 'Option 1' });
      vote.addOption({ text: 'Option 2' });
      vote.addOption({ text: 'Option 3' });

      const options = vote.getSortedOptions();
      expect(options[0].order).toBe(0);
      expect(options[1].order).toBe(1);
      expect(options[2].order).toBe(2);
    });

    it('stores option with correct properties', () => {
      const id = vote.addOption({ text: 'Test Option' });
      const option = vote.getOption(id);

      expect(option?.text).toBe('Test Option');
    });
  });

  describe('removeOption', () => {
    beforeEach(() => {
      vote.addOption({ id: 'opt_1', text: 'Option 1' });
      vote.addOption({ id: 'opt_2', text: 'Option 2' });
      vote.addOption({ id: 'opt_3', text: 'Option 3' });
    });

    it('removes option successfully', () => {
      const result = vote.removeOption('opt_2');

      expect(result).toBe(true);
      expect(vote.options.size).toBe(2);
      expect(vote.hasOption('opt_2')).toBe(false);
    });

    it('returns false for non-existent option', () => {
      const result = vote.removeOption('non_existent');

      expect(result).toBe(false);
      expect(vote.options.size).toBe(3);
    });

    it('reorders remaining options after removal', () => {
      vote.removeOption('opt_2');

      const options = vote.getSortedOptions();
      expect(options).toHaveLength(2);
      expect(options[0].id).toBe('opt_1');
      expect(options[0].order).toBe(0);
      expect(options[1].id).toBe('opt_3');
      expect(options[1].order).toBe(1);
    });
  });

  describe('start', () => {
    it('transitions from pending to active', () => {
      vote.status = 'pending';

      const result = vote.start();

      expect(result).toBe(true);
      expect(vote.status).toBe('active');
    });

    it('returns false when already active', () => {
      vote.status = 'active';

      const result = vote.start();

      expect(result).toBe(false);
      expect(vote.status).toBe('active');
    });

    it('returns false when closed', () => {
      vote.status = 'closed';

      const result = vote.start();

      expect(result).toBe(false);
      expect(vote.status).toBe('closed');
    });
  });

  describe('close', () => {
    it('transitions from active to closed', () => {
      vote.status = 'active';

      const result = vote.close();

      expect(result).toBe(true);
      expect(vote.status).toBe('closed');
      expect(vote.closedAt).toBeGreaterThan(0);
    });

    it('returns false when pending', () => {
      vote.status = 'pending';

      const result = vote.close();

      expect(result).toBe(false);
      expect(vote.status).toBe('pending');
    });

    it('returns false when already closed', () => {
      vote.status = 'closed';
      const originalClosedAt = vote.closedAt;

      const result = vote.close();

      expect(result).toBe(false);
      expect(vote.status).toBe('closed');
      expect(vote.closedAt).toBe(originalClosedAt);
    });
  });

  describe('status checks', () => {
    it('isActive returns true for active status', () => {
      vote.status = 'active';
      expect(vote.isActive()).toBe(true);
    });

    it('isActive returns false for pending status', () => {
      vote.status = 'pending';
      expect(vote.isActive()).toBe(false);
    });

    it('isActive returns false for closed status', () => {
      vote.status = 'closed';
      expect(vote.isActive()).toBe(false);
    });

    it('isClosed returns true for closed status', () => {
      vote.status = 'closed';
      expect(vote.isClosed()).toBe(true);
    });

    it('isPending returns true for pending status', () => {
      vote.status = 'pending';
      expect(vote.isPending()).toBe(true);
    });
  });
});

describe('VotingService', () => {
  let service: VotingService;

  beforeEach(() => {
    service = new VotingService();
  });

  describe('createVote', () => {
    it('creates vote with correct properties', () => {
      const vote = service.createVote(
        'meeting_001',
        'Test Question?',
        ['Option A', 'Option B'],
        false,
        'user_001'
      );

      expect(vote.id).toBeDefined();
      expect(vote.meetingId).toBe('meeting_001');
      expect(vote.question).toBe('Test Question?');
      expect(vote.anonymous).toBe(false);
      expect(vote.status).toBe('pending');
      expect(vote.createdBy).toBe('user_001');
      expect(vote.createdAt).toBeGreaterThan(0);
    });

    it('creates vote with options', () => {
      const vote = service.createVote('meeting_001', 'Test?', ['A', 'B', 'C'], false, 'user_001');

      expect(vote.getOptionCount()).toBe(3);
      expect(vote.getSortedOptions()[0].text).toBe('A');
      expect(vote.getSortedOptions()[1].text).toBe('B');
      expect(vote.getSortedOptions()[2].text).toBe('C');
    });

    it('generates unique IDs for each vote', () => {
      const vote1 = service.createVote('m1', 'Q1?', ['A'], false, 'u1');
      const vote2 = service.createVote('m1', 'Q2?', ['B'], false, 'u1');

      expect(vote1.id).not.toBe(vote2.id);
    });

    it('creates anonymous vote', () => {
      const vote = service.createVote('meeting_001', 'Test?', ['A', 'B'], true, 'user_001');

      expect(vote.anonymous).toBe(true);
    });
  });

  describe('startVote', () => {
    it('starts pending vote', () => {
      const vote = service.createVote('m1', 'Q?', ['A'], false, 'u1');
      expect(vote.status).toBe('pending');

      const started = service.startVote(vote.id);

      expect(started).not.toBeNull();
      expect(started?.status).toBe('active');
    });

    it('returns null for non-existent vote', () => {
      const result = service.startVote('non_existent');

      expect(result).toBeNull();
    });

    it('returns null when vote is already active', () => {
      const vote = service.createVote('m1', 'Q?', ['A'], false, 'u1');
      service.startVote(vote.id);

      const result = service.startVote(vote.id);

      expect(result).toBeNull();
    });

    it('returns null when vote is closed', () => {
      const vote = service.createVote('m1', 'Q?', ['A'], false, 'u1');
      service.startVote(vote.id);
      service.closeVote(vote.id);

      const result = service.startVote(vote.id);

      expect(result).toBeNull();
    });
  });

  describe('closeVote', () => {
    it('closes active vote', () => {
      const vote = service.createVote('m1', 'Q?', ['A'], false, 'u1');
      service.startVote(vote.id);

      const closed = service.closeVote(vote.id);

      expect(closed).not.toBeNull();
      expect(closed?.status).toBe('closed');
    });

    it('returns null for non-existent vote', () => {
      const result = service.closeVote('non_existent');

      expect(result).toBeNull();
    });

    it('returns null when vote is pending', () => {
      const vote = service.createVote('m1', 'Q?', ['A'], false, 'u1');

      const result = service.closeVote(vote.id);

      expect(result).toBeNull();
    });

    it('returns null when vote is already closed', () => {
      const vote = service.createVote('m1', 'Q?', ['A'], false, 'u1');
      service.startVote(vote.id);
      service.closeVote(vote.id);

      const result = service.closeVote(vote.id);

      expect(result).toBeNull();
    });
  });

  describe('castVote', () => {
    it('casts vote when vote is active', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();

      const cast = service.castVote(vote.id, options[0].id, 'voter_001');

      expect(cast).not.toBeNull();
      expect(cast?.optionId).toBe(options[0].id);
      expect(cast?.voterId).toBe('voter_001');
    });

    it('returns null when vote is pending', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      const options = vote.getSortedOptions();

      const cast = service.castVote(vote.id, options[0].id, 'voter_001');

      expect(cast).toBeNull();
    });

    it('returns null when vote is closed', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      service.closeVote(vote.id);
      const options = vote.getSortedOptions();

      const cast = service.castVote(vote.id, options[0].id, 'voter_001');

      expect(cast).toBeNull();
    });

    it('returns null for non-existent vote', () => {
      const cast = service.castVote('non_existent', 'opt_1', 'voter_001');

      expect(cast).toBeNull();
    });

    it('returns null for invalid option', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);

      const cast = service.castVote(vote.id, 'invalid_option', 'voter_001');

      expect(cast).toBeNull();
    });

    it('prevents duplicate votes from same voter', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();

      const cast1 = service.castVote(vote.id, options[0].id, 'voter_001');
      expect(cast1).not.toBeNull();

      const cast2 = service.castVote(vote.id, options[1].id, 'voter_001');
      expect(cast2).toBeNull();
    });

    it('casts vote with empty voterId for anonymous votes', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], true, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();

      const cast = service.castVote(vote.id, options[0].id, 'voter_001');

      expect(cast).not.toBeNull();
      expect(cast?.voterId).toBe('');
    });

    it('allows multiple voters for same option', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();

      const cast1 = service.castVote(vote.id, options[0].id, 'voter_001');
      const cast2 = service.castVote(vote.id, options[0].id, 'voter_002');

      expect(cast1).not.toBeNull();
      expect(cast2).not.toBeNull();
    });
  });

  describe('retractVote', () => {
    it('retracts vote when vote is active', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();
      service.castVote(vote.id, options[0].id, 'voter_001');

      const result = service.retractVote(vote.id, 'voter_001');

      expect(result).toBe(true);
    });

    it('returns false when vote is pending', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      const options = vote.getSortedOptions();
      service.startVote(vote.id);
      service.castVote(vote.id, options[0].id, 'voter_001');
      vote.status = 'pending';

      const result = service.retractVote(vote.id, 'voter_001');

      expect(result).toBe(false);
    });

    it('returns false when vote is closed', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();
      service.castVote(vote.id, options[0].id, 'voter_001');
      service.closeVote(vote.id);

      const result = service.retractVote(vote.id, 'voter_001');

      expect(result).toBe(false);
    });

    it('returns false for non-existent vote', () => {
      const result = service.retractVote('non_existent', 'voter_001');

      expect(result).toBe(false);
    });

    it('returns false for anonymous votes', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], true, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();
      service.castVote(vote.id, options[0].id, 'voter_001');

      const result = service.retractVote(vote.id, 'voter_001');

      expect(result).toBe(false);
    });

    it('returns false when voter has not voted', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);

      const result = service.retractVote(vote.id, 'voter_001');

      expect(result).toBe(false);
    });
  });

  describe('getVote', () => {
    it('returns vote by ID', () => {
      const vote = service.createVote('m1', 'Q?', ['A'], false, 'u1');

      const retrieved = service.getVote(vote.id);

      expect(retrieved).toBe(vote);
    });

    it('returns undefined for non-existent vote', () => {
      const result = service.getVote('non_existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getVotesByMeeting', () => {
    it('returns votes for specific meeting', () => {
      service.createVote('meeting_001', 'Q1?', ['A'], false, 'u1');
      service.createVote('meeting_001', 'Q2?', ['B'], false, 'u1');
      service.createVote('meeting_002', 'Q3?', ['C'], false, 'u1');

      const votes = service.getVotesByMeeting('meeting_001');

      expect(votes).toHaveLength(2);
    });

    it('returns empty array when no votes exist', () => {
      const votes = service.getVotesByMeeting('meeting_999');

      expect(votes).toEqual([]);
    });

    it('returns votes sorted by creation time', async () => {
      const vote1 = service.createVote('meeting_001', 'Q1?', ['A'], false, 'u1');
      await new Promise(resolve => setTimeout(resolve, 10));
      const vote2 = service.createVote('meeting_001', 'Q2?', ['B'], false, 'u1');

      const votes = service.getVotesByMeeting('meeting_001');

      expect(votes[0].id).toBe(vote1.id);
      expect(votes[1].id).toBe(vote2.id);
    });
  });

  describe('getResults', () => {
    it('returns results for vote', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();
      service.castVote(vote.id, options[0].id, 'voter_001');
      service.castVote(vote.id, options[0].id, 'voter_002');
      service.castVote(vote.id, options[1].id, 'voter_003');

      const results = service.getResults(vote.id);

      expect(results).toBeDefined();
      expect(results?.get(options[0].id)).toBe(2);
      expect(results?.get(options[1].id)).toBe(1);
    });

    it('returns undefined for non-existent vote', () => {
      const results = service.getResults('non_existent');

      expect(results).toBeUndefined();
    });

    it('returns zero counts for options with no votes', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B', 'C'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();
      service.castVote(vote.id, options[0].id, 'voter_001');

      const results = service.getResults(vote.id);

      expect(results?.get(options[0].id)).toBe(1);
      expect(results?.get(options[1].id)).toBe(0);
      expect(results?.get(options[2].id)).toBe(0);
    });
  });

  describe('hasVoted', () => {
    it('returns true when voter has voted', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();
      service.castVote(vote.id, options[0].id, 'voter_001');

      const result = service.hasVoted(vote.id, 'voter_001');

      expect(result).toBe(true);
    });

    it('returns false when voter has not voted', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();
      service.castVote(vote.id, options[0].id, 'voter_001');

      const result = service.hasVoted(vote.id, 'voter_002');

      expect(result).toBe(false);
    });

    it('returns false for non-existent vote', () => {
      const result = service.hasVoted('non_existent', 'voter_001');

      expect(result).toBe(false);
    });

    it('returns false for anonymous votes', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], true, 'u1');
      service.startVote(vote.id);
      const options = vote.getSortedOptions();
      service.castVote(vote.id, options[0].id, 'voter_001');

      const result = service.hasVoted(vote.id, 'voter_001');

      expect(result).toBe(false);
    });
  });

  describe('deleteVote', () => {
    it('deletes vote', () => {
      const vote = service.createVote('m1', 'Q?', ['A'], false, 'u1');

      const result = service.deleteVote(vote.id);

      expect(result).toBe(true);
      expect(service.getVote(vote.id)).toBeUndefined();
    });

    it('returns false for non-existent vote', () => {
      const result = service.deleteVote('non_existent');

      expect(result).toBe(false);
    });
  });

  describe('getAllVotes', () => {
    it('returns all votes', () => {
      service.createVote('m1', 'Q1?', ['A'], false, 'u1');
      service.createVote('m2', 'Q2?', ['B'], false, 'u1');
      service.createVote('m3', 'Q3?', ['C'], false, 'u1');

      const votes = service.getAllVotes();

      expect(votes).toHaveLength(3);
    });

    it('returns empty array when no votes', () => {
      const votes = service.getAllVotes();

      expect(votes).toEqual([]);
    });
  });

  describe('vote lifecycle', () => {
    it('complete lifecycle from pending to closed', () => {
      const vote = service.createVote('m1', 'Q?', ['A', 'B'], false, 'u1');
      expect(vote.status).toBe('pending');

      const started = service.startVote(vote.id);
      expect(started?.status).toBe('active');

      const options = vote.getSortedOptions();
      const cast = service.castVote(vote.id, options[0].id, 'voter_001');
      expect(cast).not.toBeNull();

      const closed = service.closeVote(vote.id);
      expect(closed?.status).toBe('closed');

      const afterClosed = service.castVote(vote.id, options[1].id, 'voter_002');
      expect(afterClosed).toBeNull();
    });
  });
});
