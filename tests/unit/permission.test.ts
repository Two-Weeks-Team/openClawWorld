import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionService } from '../../packages/server/src/services/PermissionService.js';
import { RoomState } from '../../packages/server/src/schemas/RoomState.js';
import { OrganizationSchema } from '../../packages/server/src/schemas/OrganizationSchema.js';
import { TeamSchema } from '../../packages/server/src/schemas/TeamSchema.js';
import { TeamMemberSchema } from '../../packages/server/src/schemas/TeamMemberSchema.js';

describe('PermissionService', () => {
  let state: RoomState;
  let permissionService: PermissionService;
  const orgId = 'org_001';
  const teamId = 'team_001';
  const ownerId = 'entity_owner';
  const adminId = 'entity_admin';
  const memberId = 'entity_member';
  const guestId = 'entity_guest';
  const nonMemberId = 'entity_nonmember';

  beforeEach(() => {
    state = new RoomState('default', 'lobby');

    const org = new OrganizationSchema(orgId, 'Test Org', ownerId);
    state.organizations.set(orgId, org);

    const team = new TeamSchema(teamId, orgId, 'Test Team');

    const ownerMember = new TeamMemberSchema(ownerId, 'owner');
    const adminMember = new TeamMemberSchema(adminId, 'admin');
    const regularMember = new TeamMemberSchema(memberId, 'member');
    const guestMember = new TeamMemberSchema(guestId, 'guest');

    team.members.set(ownerId, ownerMember);
    team.members.set(adminId, adminMember);
    team.members.set(memberId, regularMember);
    team.members.set(guestId, guestMember);

    state.teams.set(teamId, team);

    permissionService = new PermissionService(state);
  });

  describe('getEntityRole', () => {
    it('returns owner role for owner entity', () => {
      expect(permissionService.getEntityRole(ownerId, teamId)).toBe('owner');
    });

    it('returns admin role for admin entity', () => {
      expect(permissionService.getEntityRole(adminId, teamId)).toBe('admin');
    });

    it('returns member role for member entity', () => {
      expect(permissionService.getEntityRole(memberId, teamId)).toBe('member');
    });

    it('returns guest role for guest entity', () => {
      expect(permissionService.getEntityRole(guestId, teamId)).toBe('guest');
    });

    it('returns null for non-member entity', () => {
      expect(permissionService.getEntityRole(nonMemberId, teamId)).toBeNull();
    });

    it('returns null for non-existent team', () => {
      expect(permissionService.getEntityRole(ownerId, 'nonexistent_team')).toBeNull();
    });
  });

  describe('isOwner', () => {
    it('returns true for organization owner', () => {
      expect(permissionService.isOwner(ownerId, orgId)).toBe(true);
    });

    it('returns false for admin', () => {
      expect(permissionService.isOwner(adminId, orgId)).toBe(false);
    });

    it('returns false for member', () => {
      expect(permissionService.isOwner(memberId, orgId)).toBe(false);
    });

    it('returns false for non-existent organization', () => {
      expect(permissionService.isOwner(ownerId, 'nonexistent_org')).toBe(false);
    });
  });

  describe('isAdminOrAbove', () => {
    it('returns true for owner', () => {
      expect(permissionService.isAdminOrAbove(ownerId, teamId)).toBe(true);
    });

    it('returns true for admin', () => {
      expect(permissionService.isAdminOrAbove(adminId, teamId)).toBe(true);
    });

    it('returns false for member', () => {
      expect(permissionService.isAdminOrAbove(memberId, teamId)).toBe(false);
    });

    it('returns false for guest', () => {
      expect(permissionService.isAdminOrAbove(guestId, teamId)).toBe(false);
    });

    it('returns false for non-member', () => {
      expect(permissionService.isAdminOrAbove(nonMemberId, teamId)).toBe(false);
    });
  });

  describe('canEditBoard', () => {
    it('returns true for owner', () => {
      expect(permissionService.canEditBoard(ownerId, teamId)).toBe(true);
    });

    it('returns true for admin', () => {
      expect(permissionService.canEditBoard(adminId, teamId)).toBe(true);
    });

    it('returns false for member', () => {
      expect(permissionService.canEditBoard(memberId, teamId)).toBe(false);
    });

    it('returns false for guest', () => {
      expect(permissionService.canEditBoard(guestId, teamId)).toBe(false);
    });
  });

  describe('canCreateMeeting', () => {
    it('returns true for owner', () => {
      expect(permissionService.canCreateMeeting(ownerId, teamId)).toBe(true);
    });

    it('returns true for admin', () => {
      expect(permissionService.canCreateMeeting(adminId, teamId)).toBe(true);
    });

    it('returns true for member', () => {
      expect(permissionService.canCreateMeeting(memberId, teamId)).toBe(true);
    });

    it('returns false for guest', () => {
      expect(permissionService.canCreateMeeting(guestId, teamId)).toBe(false);
    });

    it('returns false for non-member', () => {
      expect(permissionService.canCreateMeeting(nonMemberId, teamId)).toBe(false);
    });
  });

  describe('canInviteToTeam', () => {
    it('returns true for owner', () => {
      expect(permissionService.canInviteToTeam(ownerId, teamId)).toBe(true);
    });

    it('returns true for admin', () => {
      expect(permissionService.canInviteToTeam(adminId, teamId)).toBe(true);
    });

    it('returns false for member', () => {
      expect(permissionService.canInviteToTeam(memberId, teamId)).toBe(false);
    });

    it('returns false for guest', () => {
      expect(permissionService.canInviteToTeam(guestId, teamId)).toBe(false);
    });
  });

  describe('canModerateChat', () => {
    it('returns true for owner', () => {
      expect(permissionService.canModerateChat(ownerId, teamId)).toBe(true);
    });

    it('returns true for admin', () => {
      expect(permissionService.canModerateChat(adminId, teamId)).toBe(true);
    });

    it('returns false for member', () => {
      expect(permissionService.canModerateChat(memberId, teamId)).toBe(false);
    });

    it('returns false for guest', () => {
      expect(permissionService.canModerateChat(guestId, teamId)).toBe(false);
    });
  });

  describe('canViewBoard', () => {
    it('returns true for owner', () => {
      expect(permissionService.canViewBoard(ownerId, teamId)).toBe(true);
    });

    it('returns true for admin', () => {
      expect(permissionService.canViewBoard(adminId, teamId)).toBe(true);
    });

    it('returns true for member', () => {
      expect(permissionService.canViewBoard(memberId, teamId)).toBe(true);
    });

    it('returns true for guest', () => {
      expect(permissionService.canViewBoard(guestId, teamId)).toBe(true);
    });

    it('returns false for non-member', () => {
      expect(permissionService.canViewBoard(nonMemberId, teamId)).toBe(false);
    });
  });

  describe('canPostNotice', () => {
    it('returns true for owner', () => {
      expect(permissionService.canPostNotice(ownerId, teamId)).toBe(true);
    });

    it('returns true for admin', () => {
      expect(permissionService.canPostNotice(adminId, teamId)).toBe(true);
    });

    it('returns false for member', () => {
      expect(permissionService.canPostNotice(memberId, teamId)).toBe(false);
    });

    it('returns false for guest', () => {
      expect(permissionService.canPostNotice(guestId, teamId)).toBe(false);
    });
  });

  describe('canDeleteOrg', () => {
    it('returns true for organization owner', () => {
      expect(permissionService.canDeleteOrg(ownerId, orgId)).toBe(true);
    });

    it('returns false for admin', () => {
      expect(permissionService.canDeleteOrg(adminId, orgId)).toBe(false);
    });

    it('returns false for member', () => {
      expect(permissionService.canDeleteOrg(memberId, orgId)).toBe(false);
    });

    it('returns false for guest', () => {
      expect(permissionService.canDeleteOrg(guestId, orgId)).toBe(false);
    });

    it('returns false for non-existent organization', () => {
      expect(permissionService.canDeleteOrg(ownerId, 'nonexistent_org')).toBe(false);
    });
  });

  describe('Permission Matrix Validation', () => {
    const permissions = [
      { method: 'canViewBoard', owner: true, admin: true, member: true, guest: true },
      { method: 'canCreateMeeting', owner: true, admin: true, member: true, guest: false },
      { method: 'canEditBoard', owner: true, admin: true, member: false, guest: false },
      { method: 'canPostNotice', owner: true, admin: true, member: false, guest: false },
      { method: 'canInviteToTeam', owner: true, admin: true, member: false, guest: false },
      { method: 'canModerateChat', owner: true, admin: true, member: false, guest: false },
    ] as const;

    for (const perm of permissions) {
      describe(`${perm.method} permission matrix`, () => {
        it(`owner: ${perm.owner}`, () => {
          expect(
            (permissionService[perm.method] as (e: string, t: string) => boolean)(ownerId, teamId)
          ).toBe(perm.owner);
        });

        it(`admin: ${perm.admin}`, () => {
          expect(
            (permissionService[perm.method] as (e: string, t: string) => boolean)(adminId, teamId)
          ).toBe(perm.admin);
        });

        it(`member: ${perm.member}`, () => {
          expect(
            (permissionService[perm.method] as (e: string, t: string) => boolean)(memberId, teamId)
          ).toBe(perm.member);
        });

        it(`guest: ${perm.guest}`, () => {
          expect(
            (permissionService[perm.method] as (e: string, t: string) => boolean)(guestId, teamId)
          ).toBe(perm.guest);
        });
      });
    }

    describe('canDeleteOrg permission (org-level)', () => {
      it('owner: true', () => {
        expect(permissionService.canDeleteOrg(ownerId, orgId)).toBe(true);
      });

      it('admin: false', () => {
        expect(permissionService.canDeleteOrg(adminId, orgId)).toBe(false);
      });

      it('member: false', () => {
        expect(permissionService.canDeleteOrg(memberId, orgId)).toBe(false);
      });

      it('guest: false', () => {
        expect(permissionService.canDeleteOrg(guestId, orgId)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty team members map', () => {
      const emptyTeam = new TeamSchema('empty_team', orgId, 'Empty Team');
      state.teams.set('empty_team', emptyTeam);

      expect(permissionService.getEntityRole(ownerId, 'empty_team')).toBeNull();
      expect(permissionService.canViewBoard(ownerId, 'empty_team')).toBe(false);
    });

    it('handles organization without owner', () => {
      const orphanOrg = new OrganizationSchema('orphan_org', 'Orphan Org');
      state.organizations.set('orphan_org', orphanOrg);

      expect(permissionService.isOwner(ownerId, 'orphan_org')).toBe(false);
      expect(permissionService.canDeleteOrg(ownerId, 'orphan_org')).toBe(false);
    });

    it('correctly differentiates team-level and org-level permissions', () => {
      const orgOwnerNotInTeam = 'org_owner_not_in_team';
      const org2 = new OrganizationSchema('org_002', 'Another Org', orgOwnerNotInTeam);
      state.organizations.set('org_002', org2);

      expect(permissionService.canDeleteOrg(orgOwnerNotInTeam, 'org_002')).toBe(true);
      expect(permissionService.canViewBoard(orgOwnerNotInTeam, teamId)).toBe(false);
      expect(permissionService.canEditBoard(orgOwnerNotInTeam, teamId)).toBe(false);
    });
  });
});
