import { describe, it, expect, beforeEach } from 'vitest';
import { FacilityService } from '../../packages/server/src/services/FacilityService.js';
import { FacilitySchema } from '../../packages/server/src/schemas/FacilitySchema.js';
import { RoomState } from '../../packages/server/src/schemas/RoomState.js';

describe('FacilitySchema', () => {
  describe('constructor', () => {
    it('creates a facility with default values', () => {
      const facility = new FacilitySchema();

      expect(facility.id).toBe('');
      expect(facility.type).toBe('');
      expect(facility.zoneId).toBe('plaza');
      expect(facility.position.x).toBe(0);
      expect(facility.position.y).toBe(0);
    });

    it('creates a facility with provided values', () => {
      const facility = new FacilitySchema('fac_001', 'reception_desk', 'office', 100, 200);

      expect(facility.id).toBe('fac_001');
      expect(facility.type).toBe('reception_desk');
      expect(facility.zoneId).toBe('office');
      expect(facility.position.x).toBe(100);
      expect(facility.position.y).toBe(200);
    });
  });

  describe('setPosition', () => {
    it('updates the facility position', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 0, 0);

      facility.setPosition(150, 250);

      expect(facility.position.x).toBe(150);
      expect(facility.position.y).toBe(250);
    });
  });

  describe('state management', () => {
    it('sets and gets state values', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza');

      facility.setState('isOpen', 'true');

      expect(facility.getState('isOpen')).toBe('true');
    });

    it('returns undefined for non-existent state key', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza');

      expect(facility.getState('nonExistent')).toBeUndefined();
    });

    it('overwrites existing state values', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza');

      facility.setState('isOpen', 'true');
      facility.setState('isOpen', 'false');

      expect(facility.getState('isOpen')).toBe('false');
    });
  });

  describe('affordance management', () => {
    it('adds affordances', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza');

      facility.addAffordance('open');
      facility.addAffordance('close');

      expect(facility.getAffordances()).toContain('open');
      expect(facility.getAffordances()).toContain('close');
    });

    it('does not add duplicate affordances', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza');

      facility.addAffordance('open');
      facility.addAffordance('open');

      expect(facility.getAffordances()).toHaveLength(1);
    });

    it('removes affordances', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza');

      facility.addAffordance('open');
      facility.addAffordance('close');
      facility.removeAffordance('open');

      expect(facility.getAffordances()).not.toContain('open');
      expect(facility.getAffordances()).toContain('close');
    });

    it('checks if affordance exists', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza');

      facility.addAffordance('open');

      expect(facility.hasAffordance('open')).toBe(true);
      expect(facility.hasAffordance('close')).toBe(false);
    });

    it('sets all affordances at once', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza');

      facility.addAffordance('open');
      facility.setAffordances(['enter', 'exit', 'inspect']);

      expect(facility.getAffordances()).toEqual(['enter', 'exit', 'inspect']);
    });
  });
});

describe('FacilityService', () => {
  let state: RoomState;
  let service: FacilityService;

  beforeEach(() => {
    state = new RoomState('default', 'plaza');
    service = new FacilityService(state);
  });

  describe('registerFacility', () => {
    it('adds a facility to the room state', () => {
      const facility = new FacilitySchema('fac_001', 'reception_desk', 'plaza', 100, 100);

      service.registerFacility(facility);

      expect(state.getFacility('fac_001')).toBe(facility);
    });
  });

  describe('unregisterFacility', () => {
    it('removes a facility from the room state', () => {
      const facility = new FacilitySchema('fac_001', 'reception_desk', 'plaza', 100, 100);
      service.registerFacility(facility);

      const result = service.unregisterFacility('fac_001');

      expect(result).toBe(true);
      expect(state.getFacility('fac_001')).toBeUndefined();
    });

    it('returns false for non-existent facility', () => {
      const result = service.unregisterFacility('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getFacility', () => {
    it('returns facility by ID', () => {
      const facility = new FacilitySchema('fac_001', 'reception_desk', 'plaza', 100, 100);
      service.registerFacility(facility);

      const found = service.getFacility('fac_001');

      expect(found).toBe(facility);
    });

    it('returns undefined for non-existent facility', () => {
      const found = service.getFacility('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getFacilitiesInZone', () => {
    it('returns facilities in a specific zone', () => {
      service.registerFacility(new FacilitySchema('fac_001', 'reception_desk', 'plaza', 100, 100));
      service.registerFacility(new FacilitySchema('fac_002', 'gate', 'plaza', 200, 100));
      service.registerFacility(new FacilitySchema('fac_003', 'meeting_door', 'office', 300, 100));

      const plazaFacilities = service.getFacilitiesInZone('plaza');

      expect(plazaFacilities).toHaveLength(2);
      expect(plazaFacilities.map(f => f.id)).toContain('fac_001');
      expect(plazaFacilities.map(f => f.id)).toContain('fac_002');
    });

    it('returns empty array for zone with no facilities', () => {
      const facilities = service.getFacilitiesInZone('arcade');

      expect(facilities).toHaveLength(0);
    });
  });

  describe('getAffordances', () => {
    it('returns affordances from facility schema', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      facility.setAffordances(['open', 'close', 'inspect']);
      service.registerFacility(facility);

      const affordances = service.getAffordances('fac_001', 'entity_001');

      expect(affordances).toEqual(['open', 'close', 'inspect']);
    });

    it('returns empty array for non-existent facility', () => {
      const affordances = service.getAffordances('non-existent', 'entity_001');

      expect(affordances).toHaveLength(0);
    });

    it('uses custom affordance resolver when registered', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      facility.setAffordances(['open', 'close']);
      service.registerFacility(facility);

      service.registerAffordanceResolver('gate', (_fac, entityId) => {
        return entityId === 'admin' ? ['open', 'close', 'lock'] : ['open'];
      });

      expect(service.getAffordances('fac_001', 'admin')).toEqual(['open', 'close', 'lock']);
      expect(service.getAffordances('fac_001', 'guest')).toEqual(['open']);
    });
  });

  describe('interact', () => {
    it('returns invalid_action for non-existent facility', () => {
      const outcome = service.interact('non-existent', 'entity_001', 'open', {});

      expect(outcome.type).toBe('invalid_action');
      expect(outcome.message).toContain('not found');
    });

    it('returns invalid_action for unavailable action', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      facility.setAffordances(['open']);
      service.registerFacility(facility);

      const outcome = service.interact('fac_001', 'entity_001', 'close', {});

      expect(outcome.type).toBe('invalid_action');
      expect(outcome.message).toContain('not available');
    });

    it('returns invalid_action when no handler registered', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      facility.setAffordances(['open']);
      service.registerFacility(facility);

      const outcome = service.interact('fac_001', 'entity_001', 'open', {});

      expect(outcome.type).toBe('invalid_action');
      expect(outcome.message).toContain('No handlers registered');
    });

    it('executes registered handler', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      facility.setAffordances(['open']);
      service.registerFacility(facility);

      service.registerHandler('gate', 'open', (fac, _entityId, _params) => {
        fac.setState('isOpen', 'true');
        return { type: 'ok', message: 'Gate opened' };
      });

      const outcome = service.interact('fac_001', 'entity_001', 'open', {});

      expect(outcome.type).toBe('ok');
      expect(outcome.message).toBe('Gate opened');
      expect(facility.getState('isOpen')).toBe('true');
    });

    it('passes params to handler', () => {
      const facility = new FacilitySchema('fac_001', 'reception_desk', 'plaza', 100, 100);
      facility.setAffordances(['check_in']);
      service.registerFacility(facility);

      let receivedParams: Record<string, unknown> = {};
      service.registerHandler('reception_desk', 'check_in', (_fac, _entityId, params) => {
        receivedParams = params;
        return { type: 'ok', message: 'Checked in' };
      });

      service.interact('fac_001', 'entity_001', 'check_in', { visitId: '123' });

      expect(receivedParams).toEqual({ visitId: '123' });
    });
  });

  describe('setState', () => {
    it('sets state on existing facility', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      service.registerFacility(facility);

      const result = service.setState('fac_001', 'isOpen', 'true');

      expect(result).toBe(true);
      expect(facility.getState('isOpen')).toBe('true');
    });

    it('returns false for non-existent facility', () => {
      const result = service.setState('non-existent', 'isOpen', 'true');

      expect(result).toBe(false);
    });
  });

  describe('getState', () => {
    it('gets state from existing facility', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      facility.setState('isOpen', 'true');
      service.registerFacility(facility);

      const value = service.getState('fac_001', 'isOpen');

      expect(value).toBe('true');
    });

    it('returns undefined for non-existent facility', () => {
      const value = service.getState('non-existent', 'isOpen');

      expect(value).toBeUndefined();
    });
  });

  describe('registerHandler and unregisterHandler', () => {
    it('registers and uses handler', () => {
      const facility = new FacilitySchema('fac_001', 'door', 'plaza', 100, 100);
      facility.setAffordances(['knock']);
      service.registerFacility(facility);

      service.registerHandler('door', 'knock', () => ({
        type: 'ok',
        message: 'Someone answered',
      }));

      const outcome = service.interact('fac_001', 'entity_001', 'knock', {});

      expect(outcome.type).toBe('ok');
    });

    it('unregisters handler', () => {
      service.registerHandler('door', 'knock', () => ({
        type: 'ok',
        message: 'Someone answered',
      }));

      const result = service.unregisterHandler('door', 'knock');

      expect(result).toBe(true);
    });

    it('returns false when unregistering non-existent handler', () => {
      const result = service.unregisterHandler('door', 'knock');

      expect(result).toBe(false);
    });
  });

  describe('hasFacility', () => {
    it('returns true for existing facility', () => {
      service.registerFacility(new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100));

      expect(service.hasFacility('fac_001')).toBe(true);
    });

    it('returns false for non-existent facility', () => {
      expect(service.hasFacility('non-existent')).toBe(false);
    });
  });

  describe('getAllFacilities', () => {
    it('returns all registered facilities', () => {
      service.registerFacility(new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100));
      service.registerFacility(new FacilitySchema('fac_002', 'door', 'office', 200, 100));

      const all = service.getAllFacilities();

      expect(all).toHaveLength(2);
    });

    it('returns empty array when no facilities', () => {
      const all = service.getAllFacilities();

      expect(all).toHaveLength(0);
    });
  });

  describe('getFacilitiesByType', () => {
    it('returns facilities of specific type', () => {
      service.registerFacility(new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100));
      service.registerFacility(new FacilitySchema('fac_002', 'gate', 'office', 200, 100));
      service.registerFacility(new FacilitySchema('fac_003', 'door', 'plaza', 300, 100));

      const gates = service.getFacilitiesByType('gate');

      expect(gates).toHaveLength(2);
      expect(gates.every(f => f.type === 'gate')).toBe(true);
    });

    it('returns empty array for non-existent type', () => {
      const facilities = service.getFacilitiesByType('non-existent');

      expect(facilities).toHaveLength(0);
    });
  });

  describe('setFacilityPosition', () => {
    it('updates facility position', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      service.registerFacility(facility);

      const result = service.setFacilityPosition('fac_001', 200, 300);

      expect(result).toBe(true);
      expect(facility.position.x).toBe(200);
      expect(facility.position.y).toBe(300);
    });

    it('returns false for non-existent facility', () => {
      const result = service.setFacilityPosition('non-existent', 100, 100);

      expect(result).toBe(false);
    });
  });

  describe('setFacilityZone', () => {
    it('updates facility zone', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      service.registerFacility(facility);

      const result = service.setFacilityZone('fac_001', 'office');

      expect(result).toBe(true);
      expect(facility.zoneId).toBe('office');
    });

    it('returns false for non-existent facility', () => {
      const result = service.setFacilityZone('non-existent', 'office');

      expect(result).toBe(false);
    });
  });

  describe('createFacility', () => {
    it('creates and registers a new facility', () => {
      const facility = service.createFacility('fac_001', 'gate', 'lobby', 100, 200);

      expect(facility.id).toBe('fac_001');
      expect(facility.type).toBe('gate');
      expect(facility.zoneId).toBe('lobby');
      expect(facility.position.x).toBe(100);
      expect(facility.position.y).toBe(200);
      expect(service.hasFacility('fac_001')).toBe(true);
    });

    it('creates facility with affordances', () => {
      const facility = service.createFacility('fac_001', 'gate', 'plaza', 100, 200, [
        'open',
        'close',
        'lock',
      ]);

      expect(facility.getAffordances()).toEqual(['open', 'close', 'lock']);
    });
  });
});

describe('RoomState facility integration', () => {
  let state: RoomState;

  beforeEach(() => {
    state = new RoomState('default', 'plaza');
  });

  describe('addFacility', () => {
    it('adds facility to state', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);

      state.addFacility(facility);

      expect(state.facilities.has('fac_001')).toBe(true);
    });
  });

  describe('removeFacility', () => {
    it('removes facility from state', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      state.addFacility(facility);

      const result = state.removeFacility('fac_001');

      expect(result).toBe(true);
      expect(state.facilities.has('fac_001')).toBe(false);
    });

    it('returns false for non-existent facility', () => {
      const result = state.removeFacility('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getFacility', () => {
    it('returns facility by ID', () => {
      const facility = new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100);
      state.addFacility(facility);

      const found = state.getFacility('fac_001');

      expect(found).toBe(facility);
    });

    it('returns undefined for non-existent facility', () => {
      const found = state.getFacility('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('getAllFacilities', () => {
    it('returns all facilities', () => {
      state.addFacility(new FacilitySchema('fac_001', 'gate', 'plaza', 100, 100));
      state.addFacility(new FacilitySchema('fac_002', 'door', 'office', 200, 100));

      const all = state.getAllFacilities();

      expect(all.size).toBe(2);
      expect(all.has('fac_001')).toBe(true);
      expect(all.has('fac_002')).toBe(true);
    });
  });
});
