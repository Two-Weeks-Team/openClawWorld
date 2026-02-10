import type { OrgRole } from '@openclawworld/shared';
import type { RoomState } from '../schemas/RoomState.js';
import type { OrganizationSchema } from '../schemas/OrganizationSchema.js';
import type { TeamSchema } from '../schemas/TeamSchema.js';

export class OrganizationService {
  constructor(private state: RoomState) {}

  getEntityOrg(entityId: string): OrganizationSchema | undefined {
    const entity = this.state.getEntity(entityId);
    if (!entity || !entity.orgId) {
      return undefined;
    }
    return this.state.organizations.get(entity.orgId);
  }

  getEntityTeam(entityId: string): TeamSchema | undefined {
    const entity = this.state.getEntity(entityId);
    if (!entity || !entity.teamId) {
      return undefined;
    }
    return this.state.teams.get(entity.teamId);
  }

  getEntityRole(entityId: string, teamId: string): OrgRole | undefined {
    const team = this.state.teams.get(teamId);
    if (!team) {
      return undefined;
    }
    const member = team.members.get(entityId);
    return member?.role;
  }

  isEntityInOrg(entityId: string, orgId: string): boolean {
    const entity = this.state.getEntity(entityId);
    return entity?.orgId === orgId;
  }

  getOrg(orgId: string): OrganizationSchema | undefined {
    return this.state.organizations.get(orgId);
  }

  getTeam(teamId: string): TeamSchema | undefined {
    return this.state.teams.get(teamId);
  }

  getOrgTeams(orgId: string): TeamSchema[] {
    const teams: TeamSchema[] = [];
    this.state.teams.forEach(team => {
      if (team.orgId === orgId) {
        teams.push(team);
      }
    });
    return teams;
  }

  getTeamMembers(teamId: string): string[] {
    const team = this.state.teams.get(teamId);
    if (!team) {
      return [];
    }
    const memberIds: string[] = [];
    team.members.forEach((_, entityId) => {
      memberIds.push(entityId);
    });
    return memberIds;
  }
}
