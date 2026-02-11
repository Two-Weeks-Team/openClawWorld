import { describe, it, expect } from 'vitest';
import type { ZoneId, FacilityType, NpcRole } from '../../packages/shared/src/types.js';

describe('Type definitions', () => {
  describe('ZoneId', () => {
    it('should accept plaza zone', () => {
      const plaza: ZoneId = 'plaza';
      expect(plaza).toBe('plaza');
    });
  });

  describe('FacilityType', () => {
    it('should accept kanban_terminal', () => {
      const type: FacilityType = 'kanban_terminal';
      expect(type).toBe('kanban_terminal');
    });

    it('should accept notice_board', () => {
      const type: FacilityType = 'notice_board';
      expect(type).toBe('notice_board');
    });

    it('should accept onboarding_signpost', () => {
      const type: FacilityType = 'onboarding_signpost';
      expect(type).toBe('onboarding_signpost');
    });

    it('should accept pond_edge', () => {
      const type: FacilityType = 'pond_edge';
      expect(type).toBe('pond_edge');
    });

    it('should accept printer', () => {
      const type: FacilityType = 'printer';
      expect(type).toBe('printer');
    });

    it('should accept watercooler', () => {
      const type: FacilityType = 'watercooler';
      expect(type).toBe('watercooler');
    });

    it('should accept vending_machine', () => {
      const type: FacilityType = 'vending_machine';
      expect(type).toBe('vending_machine');
    });

    it('should accept fountain', () => {
      const type: FacilityType = 'fountain';
      expect(type).toBe('fountain');
    });

    it('should accept schedule_kiosk', () => {
      const type: FacilityType = 'schedule_kiosk';
      expect(type).toBe('schedule_kiosk');
    });

    it('should accept agenda_panel', () => {
      const type: FacilityType = 'agenda_panel';
      expect(type).toBe('agenda_panel');
    });

    it('should accept stage', () => {
      const type: FacilityType = 'stage';
      expect(type).toBe('stage');
    });

    it('should accept game_table', () => {
      const type: FacilityType = 'game_table';
      expect(type).toBe('game_table');
    });

    it('should accept room_door_a', () => {
      const type: FacilityType = 'room_door_a';
      expect(type).toBe('room_door_a');
    });

    it('should accept room_door_b', () => {
      const type: FacilityType = 'room_door_b';
      expect(type).toBe('room_door_b');
    });

    it('should accept room_door_c', () => {
      const type: FacilityType = 'room_door_c';
      expect(type).toBe('room_door_c');
    });
  });

  describe('NpcRole', () => {
    it('should accept meeting_host', () => {
      const role: NpcRole = 'meeting_host';
      expect(role).toBe('meeting_host');
    });

    it('should accept arcade_host', () => {
      const role: NpcRole = 'arcade_host';
      expect(role).toBe('arcade_host');
    });
  });
});
