import { EntitySchema } from '../schemas/EntitySchema.js';
import type { UserStatus, UserProfile } from '@openclawworld/shared';

export class ProfileService {
  updateStatus(entity: EntitySchema, status: UserStatus): void {
    entity.status = status;
  }

  updateProfile(entity: EntitySchema, profile: Partial<UserProfile>): void {
    if (profile.status) entity.status = profile.status;
    if (profile.statusMessage !== undefined) entity.statusMessage = profile.statusMessage;
    if (profile.title !== undefined) entity.title = profile.title;
    if (profile.department !== undefined) entity.department = profile.department;
  }

  getProfile(entity: EntitySchema): UserProfile {
    return {
      entityId: entity.id,
      displayName: entity.name,
      status: entity.status as UserStatus,
      statusMessage: entity.statusMessage,
      title: entity.title,
      department: entity.department,
    };
  }
}
