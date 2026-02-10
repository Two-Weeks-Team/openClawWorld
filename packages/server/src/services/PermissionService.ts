import { RoomState } from '../schemas/RoomState.js';
import type { OrgRole } from '@openclawworld/shared';

export class PermissionService {
  constructor(private state: RoomState) {}

  getEntityRole(entityId: string, teamId: string): OrgRole | null {
    const team = this.state.teams.get(teamId);
    if (!team) return null;
    const member = team.members.get(entityId);
    return member?.role ?? null;
  }

  isOwner(entityId: string, orgId: string): boolean {
    const org = this.state.organizations.get(orgId);
    return org?.ownerId === entityId;
  }

  isAdminOrAbove(entityId: string, teamId: string): boolean {
    const role = this.getEntityRole(entityId, teamId);
    return role === 'owner' || role === 'admin';
  }

  canEditBoard(entityId: string, teamId: string): boolean {
    return this.isAdminOrAbove(entityId, teamId);
  }

  canCreateMeeting(entityId: string, teamId: string): boolean {
    const role = this.getEntityRole(entityId, teamId);
    return role !== null && role !== 'guest';
  }

  canInviteToTeam(entityId: string, teamId: string): boolean {
    return this.isAdminOrAbove(entityId, teamId);
  }

  canModerateChat(entityId: string, teamId: string): boolean {
    return this.isAdminOrAbove(entityId, teamId);
  }

  canViewBoard(entityId: string, teamId: string): boolean {
    const role = this.getEntityRole(entityId, teamId);
    return role !== null;
  }

  canPostNotice(entityId: string, teamId: string): boolean {
    return this.isAdminOrAbove(entityId, teamId);
  }

  canDeleteOrg(entityId: string, orgId: string): boolean {
    return this.isOwner(entityId, orgId);
  }
}
