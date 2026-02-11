import type { ZoneId, InteractOutcome } from '@openclawworld/shared';
import { RoomState } from '../schemas/RoomState.js';
import { FacilitySchema } from '../schemas/FacilitySchema.js';

export type FacilityActionHandler = (
  facility: FacilitySchema,
  entityId: string,
  params: Record<string, unknown>
) => InteractOutcome;

export type AffordanceResolver = (facility: FacilitySchema, entityId: string) => string[];

export class FacilityService {
  private facilityHandlers: Map<string, Map<string, FacilityActionHandler>> = new Map();
  private affordanceResolvers: Map<string, AffordanceResolver> = new Map();

  constructor(private state: RoomState) {}

  registerFacility(facility: FacilitySchema): void {
    this.state.addFacility(facility);
  }

  unregisterFacility(facilityId: string): boolean {
    return this.state.removeFacility(facilityId);
  }

  getFacility(id: string): FacilitySchema | undefined {
    return this.state.getFacility(id);
  }

  getFacilitiesInZone(zoneId: ZoneId): FacilitySchema[] {
    const facilities: FacilitySchema[] = [];
    this.state.facilities.forEach(facility => {
      if (facility.zoneId === zoneId) {
        facilities.push(facility);
      }
    });
    return facilities;
  }

  getAffordances(facilityId: string, entityId: string): string[] {
    const facility = this.getFacility(facilityId);
    if (!facility) {
      return [];
    }

    const resolver = this.affordanceResolvers.get(facility.type);
    if (resolver) {
      return resolver(facility, entityId);
    }

    return facility.getAffordances();
  }

  interact(
    facilityId: string,
    entityId: string,
    action: string,
    params: Record<string, unknown>
  ): InteractOutcome {
    const facility = this.getFacility(facilityId);
    if (!facility) {
      return {
        type: 'invalid_action',
        message: `Facility '${facilityId}' not found`,
      };
    }

    const affordances = this.getAffordances(facilityId, entityId);
    if (!affordances.includes(action)) {
      return {
        type: 'invalid_action',
        message: `Action '${action}' not available for facility '${facilityId}'`,
      };
    }

    const typeHandlers = this.facilityHandlers.get(facility.type);
    if (!typeHandlers) {
      return {
        type: 'invalid_action',
        message: `No handlers registered for facility type '${facility.type}'`,
      };
    }

    const handler = typeHandlers.get(action);
    if (!handler) {
      return {
        type: 'invalid_action',
        message: `No handler for action '${action}' on facility type '${facility.type}'`,
      };
    }

    return handler(facility, entityId, params);
  }

  setState(facilityId: string, key: string, value: string): boolean {
    const facility = this.getFacility(facilityId);
    if (!facility) {
      return false;
    }

    facility.setState(key, value);
    return true;
  }

  getState(facilityId: string, key: string): string | undefined {
    const facility = this.getFacility(facilityId);
    if (!facility) {
      return undefined;
    }

    return facility.getState(key);
  }

  registerHandler(facilityType: string, action: string, handler: FacilityActionHandler): void {
    let typeHandlers = this.facilityHandlers.get(facilityType);
    if (!typeHandlers) {
      typeHandlers = new Map();
      this.facilityHandlers.set(facilityType, typeHandlers);
    }
    typeHandlers.set(action, handler);
  }

  unregisterHandler(facilityType: string, action: string): boolean {
    const typeHandlers = this.facilityHandlers.get(facilityType);
    if (!typeHandlers) {
      return false;
    }
    return typeHandlers.delete(action);
  }

  registerAffordanceResolver(facilityType: string, resolver: AffordanceResolver): void {
    this.affordanceResolvers.set(facilityType, resolver);
  }

  unregisterAffordanceResolver(facilityType: string): boolean {
    return this.affordanceResolvers.delete(facilityType);
  }

  hasFacility(facilityId: string): boolean {
    return this.state.getFacility(facilityId) !== undefined;
  }

  getAllFacilities(): FacilitySchema[] {
    const facilities: FacilitySchema[] = [];
    this.state.facilities.forEach(facility => {
      facilities.push(facility);
    });
    return facilities;
  }

  getFacilitiesByType(facilityType: string): FacilitySchema[] {
    const facilities: FacilitySchema[] = [];
    this.state.facilities.forEach(facility => {
      if (facility.type === facilityType) {
        facilities.push(facility);
      }
    });
    return facilities;
  }

  setFacilityPosition(facilityId: string, x: number, y: number): boolean {
    const facility = this.getFacility(facilityId);
    if (!facility) {
      return false;
    }

    facility.setPosition(x, y);
    return true;
  }

  setFacilityZone(facilityId: string, zoneId: ZoneId): boolean {
    const facility = this.getFacility(facilityId);
    if (!facility) {
      return false;
    }

    facility.zoneId = zoneId;
    return true;
  }

  createFacility(
    id: string,
    facilityType: string,
    zoneId: ZoneId,
    x: number,
    y: number,
    affordances?: string[]
  ): FacilitySchema {
    const facility = new FacilitySchema(id, facilityType, zoneId, x, y);

    if (affordances) {
      facility.setAffordances(affordances);
    }

    this.registerFacility(facility);
    return facility;
  }
}
