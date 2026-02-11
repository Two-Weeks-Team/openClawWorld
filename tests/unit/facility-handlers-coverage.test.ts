import { describe, it, expect, beforeEach } from 'vitest';
import { FacilityService } from '../../packages/server/src/services/FacilityService.js';
import { FacilitySchema } from '../../packages/server/src/schemas/FacilitySchema.js';
import { RoomState } from '../../packages/server/src/schemas/RoomState.js';
import {
  registerAllFacilityHandlers,
  FACILITY_AFFORDANCES,
} from '../../packages/server/src/facilities/index.js';

describe('Facility Handlers Coverage', () => {
  let state: RoomState;
  let service: FacilityService;

  beforeEach(() => {
    state = new RoomState('default', 'plaza');
    service = new FacilityService(state);
    registerAllFacilityHandlers(service);
  });

  describe('FACILITY_AFFORDANCES export', () => {
    it('exports affordances for all required facility types', () => {
      const requiredTypes = [
        'reception_desk',
        'kanban_terminal',
        'whiteboard',
        'printer',
        'cafe_counter',
        'vending_machine',
        'schedule_kiosk',
        'voting_kiosk',
        'notice_board',
        'gate',
        'fountain',
        'game_table',
        'stage',
        'room_door_a',
        'room_door_b',
        'room_door_c',
        'agenda_panel',
        'watercooler',
        'arcade_cabinets',
        'pond_edge',
      ];

      for (const type of requiredTypes) {
        expect(FACILITY_AFFORDANCES[type]).toBeDefined();
        expect(Array.isArray(FACILITY_AFFORDANCES[type])).toBe(true);
        expect(FACILITY_AFFORDANCES[type].length).toBeGreaterThan(0);
      }
    });

    it('has at least 12 facility types (MVP requirement)', () => {
      const typeCount = Object.keys(FACILITY_AFFORDANCES).length;
      expect(typeCount).toBeGreaterThanOrEqual(12);
    });
  });

  describe('reception_desk handlers', () => {
    beforeEach(() => {
      const facility = new FacilitySchema('reception_desk_1', 'reception_desk', 'plaza', 100, 100);
      facility.setAffordances(FACILITY_AFFORDANCES.reception_desk);
      service.registerFacility(facility);
    });

    it('handles check_in action', () => {
      const result = service.interact('reception_desk_1', 'entity_001', 'check_in', {});
      expect(result.type).toBe('ok');
      expect(result.message).toContain('checked in');
    });

    it('handles get_info action', () => {
      const result = service.interact('reception_desk_1', 'entity_001', 'get_info', {});
      expect(result.type).toBe('ok');
    });
  });

  describe('kanban_terminal handlers', () => {
    beforeEach(() => {
      const facility = new FacilitySchema('kanban_1', 'kanban_terminal', 'north-block', 200, 100);
      facility.setAffordances(FACILITY_AFFORDANCES.kanban_terminal);
      service.registerFacility(facility);
    });

    it('handles view_tasks action', () => {
      const result = service.interact('kanban_1', 'entity_001', 'view_tasks', {});
      expect(result.type).toBe('ok');
    });

    it('handles create_task action', () => {
      const result = service.interact('kanban_1', 'entity_001', 'create_task', {
        title: 'Test Task',
      });
      expect(result.type).toBe('ok');
      expect(result.message).toContain('Test Task');
    });

    it('handles update_task action with taskId', () => {
      const result = service.interact('kanban_1', 'entity_001', 'update_task', {
        taskId: 'task_123',
        status: 'in_progress',
      });
      expect(result.type).toBe('ok');
      expect(result.message).toContain('task_123');
    });

    it('rejects update_task without taskId', () => {
      const result = service.interact('kanban_1', 'entity_001', 'update_task', {});
      expect(result.type).toBe('invalid_action');
      expect(result.message).toContain('Task ID required');
    });
  });

  describe('whiteboard handlers', () => {
    beforeEach(() => {
      const facility = new FacilitySchema('whiteboard_1', 'whiteboard', 'east-block', 300, 100);
      facility.setAffordances(FACILITY_AFFORDANCES.whiteboard);
      service.registerFacility(facility);
    });

    it('handles view action', () => {
      const result = service.interact('whiteboard_1', 'entity_001', 'view', {});
      expect(result.type).toBe('ok');
    });

    it('handles draw action', () => {
      const result = service.interact('whiteboard_1', 'entity_001', 'draw', {});
      expect(result.type).toBe('ok');
    });

    it('handles clear action', () => {
      const result = service.interact('whiteboard_1', 'entity_001', 'clear', {});
      expect(result.type).toBe('ok');
    });
  });

  describe('cafe_counter handlers', () => {
    beforeEach(() => {
      const facility = new FacilitySchema('cafe_1', 'cafe_counter', 'west-block', 400, 100);
      facility.setAffordances(FACILITY_AFFORDANCES.cafe_counter);
      service.registerFacility(facility);
    });

    it('handles order action', () => {
      const result = service.interact('cafe_1', 'entity_001', 'order', { item: 'latte' });
      expect(result.type).toBe('ok');
      expect(result.message).toContain('latte');
    });

    it('handles view_menu action', () => {
      const result = service.interact('cafe_1', 'entity_001', 'view_menu', {});
      expect(result.type).toBe('ok');
      expect(result.message).toContain('Menu');
    });
  });

  describe('voting_kiosk handlers', () => {
    beforeEach(() => {
      const facility = new FacilitySchema('voting_1', 'voting_kiosk', 'plaza', 500, 100);
      facility.setAffordances(FACILITY_AFFORDANCES.voting_kiosk);
      service.registerFacility(facility);
    });

    it('handles vote action with option', () => {
      const result = service.interact('voting_1', 'entity_001', 'vote', { option: 'Option A' });
      expect(result.type).toBe('ok');
      expect(result.message).toContain('Option A');
    });

    it('rejects vote without option', () => {
      const result = service.interact('voting_1', 'entity_001', 'vote', {});
      expect(result.type).toBe('invalid_action');
      expect(result.message).toContain('Vote option required');
    });

    it('handles view_results action', () => {
      const result = service.interact('voting_1', 'entity_001', 'view_results', {});
      expect(result.type).toBe('ok');
    });
  });

  describe('gate handlers', () => {
    beforeEach(() => {
      const facility = new FacilitySchema('gate_1', 'gate', 'plaza', 600, 100);
      facility.setAffordances(FACILITY_AFFORDANCES.gate);
      service.registerFacility(facility);
    });

    it('handles enter action', () => {
      const result = service.interact('gate_1', 'entity_001', 'enter', {});
      expect(result.type).toBe('ok');
    });

    it('handles exit action', () => {
      const result = service.interact('gate_1', 'entity_001', 'exit', {});
      expect(result.type).toBe('ok');
    });
  });

  describe('fountain handlers', () => {
    beforeEach(() => {
      const facility = new FacilitySchema('fountain_1', 'fountain', 'plaza', 700, 100);
      facility.setAffordances(FACILITY_AFFORDANCES.fountain);
      service.registerFacility(facility);
    });

    it('handles view action', () => {
      const result = service.interact('fountain_1', 'entity_001', 'view', {});
      expect(result.type).toBe('ok');
    });

    it('handles toss_coin action', () => {
      const result = service.interact('fountain_1', 'entity_001', 'toss_coin', {});
      expect(result.type).toBe('ok');
      expect(result.message).toContain('wish');
    });
  });

  describe('arcade_cabinets handlers', () => {
    beforeEach(() => {
      const facility = new FacilitySchema('arcade_1', 'arcade_cabinets', 'south-block', 800, 100);
      facility.setAffordances(FACILITY_AFFORDANCES.arcade_cabinets);
      service.registerFacility(facility);
    });

    it('handles play action', () => {
      const result = service.interact('arcade_1', 'entity_001', 'play', { game: 'Pac-Man' });
      expect(result.type).toBe('ok');
    });

    it('handles view_highscores action', () => {
      const result = service.interact('arcade_1', 'entity_001', 'view_highscores', {});
      expect(result.type).toBe('ok');
    });
  });

  describe('all handlers registered', () => {
    it('has handlers for all facility types in FACILITY_AFFORDANCES', () => {
      const entries = Object.entries(FACILITY_AFFORDANCES) as [string, string[]][];
      for (const [facilityType, affordances] of entries) {
        const facility = new FacilitySchema(`test_${facilityType}`, facilityType, 'plaza', 0, 0);
        facility.setAffordances(affordances);
        service.registerFacility(facility);

        for (const action of affordances) {
          const result = service.interact(`test_${facilityType}`, 'entity_001', action, {});
          expect(result.message).not.toContain('No handlers registered');
        }
      }
    });
  });
});
