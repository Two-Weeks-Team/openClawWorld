import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgendaItemSchema,
  AgendaSchema,
  type AgendaItemData,
} from '../../packages/server/src/schemas/AgendaSchema.js';

describe('AgendaItemSchema', () => {
  describe('constructor', () => {
    it('creates item with default values', () => {
      const item = new AgendaItemSchema();

      expect(item.id).toBe('');
      expect(item.title).toBe('');
      expect(item.description).toBe('');
      expect(item.durationMinutes).toBe(0);
      expect(item.completed).toBe(false);
      expect(item.order).toBe(0);
    });

    it('creates item with provided values', () => {
      const data: AgendaItemData = {
        id: 'item_001',
        title: 'Test Agenda Item',
        description: 'Test description',
        durationMinutes: 15,
        completed: true,
        order: 2,
      };
      const item = new AgendaItemSchema(data);

      expect(item.id).toBe('item_001');
      expect(item.title).toBe('Test Agenda Item');
      expect(item.description).toBe('Test description');
      expect(item.durationMinutes).toBe(15);
      expect(item.completed).toBe(true);
      expect(item.order).toBe(2);
    });

    it('creates item with partial data', () => {
      const data: AgendaItemData = {
        title: 'Partial Item',
        description: 'Only title and description',
        durationMinutes: 10,
      };
      const item = new AgendaItemSchema(data);

      expect(item.title).toBe('Partial Item');
      expect(item.description).toBe('Only title and description');
      expect(item.durationMinutes).toBe(10);
      expect(item.id).toBe('');
      expect(item.completed).toBe(false);
      expect(item.order).toBe(0);
    });
  });
});

describe('AgendaSchema', () => {
  let agenda: AgendaSchema;

  beforeEach(() => {
    agenda = new AgendaSchema();
  });

  describe('constructor', () => {
    it('creates agenda with empty items', () => {
      expect(agenda.items).toBeDefined();
      expect(agenda.items.size).toBe(0);
    });

    it('creates agenda with empty currentItemId', () => {
      expect(agenda.currentItemId).toBe('');
    });
  });

  describe('addItem', () => {
    it('adds item and returns ID', () => {
      const data: AgendaItemData = {
        title: 'Test Item',
        description: 'Test description',
        durationMinutes: 10,
      };

      const id = agenda.addItem(data);

      expect(id).toBeDefined();
      expect(agenda.items.size).toBe(1);
      expect(agenda.hasItem(id)).toBe(true);
    });

    it('generates unique IDs for each item', () => {
      const id1 = agenda.addItem({ title: 'Item 1', description: 'Desc 1', durationMinutes: 5 });
      const id2 = agenda.addItem({ title: 'Item 2', description: 'Desc 2', durationMinutes: 10 });

      expect(id1).not.toBe(id2);
    });

    it('uses provided ID when given', () => {
      const data: AgendaItemData = {
        id: 'custom_id_123',
        title: 'Custom ID Item',
        description: 'Test',
        durationMinutes: 5,
      };

      const id = agenda.addItem(data);

      expect(id).toBe('custom_id_123');
    });

    it('assigns sequential order by default', () => {
      agenda.addItem({ title: 'Item 1', description: 'Desc', durationMinutes: 5 });
      agenda.addItem({ title: 'Item 2', description: 'Desc', durationMinutes: 5 });
      agenda.addItem({ title: 'Item 3', description: 'Desc', durationMinutes: 5 });

      const items = agenda.getSortedItems();
      expect(items[0].order).toBe(0);
      expect(items[1].order).toBe(1);
      expect(items[2].order).toBe(2);
    });

    it('stores item with correct properties', () => {
      const data: AgendaItemData = {
        title: 'Test Item',
        description: 'Test description',
        durationMinutes: 15,
      };

      const id = agenda.addItem(data);
      const item = agenda.getItem(id);

      expect(item?.title).toBe('Test Item');
      expect(item?.description).toBe('Test description');
      expect(item?.durationMinutes).toBe(15);
      expect(item?.completed).toBe(false);
    });
  });

  describe('removeItem', () => {
    beforeEach(() => {
      agenda.addItem({ id: 'item_1', title: 'Item 1', description: 'Desc', durationMinutes: 5 });
      agenda.addItem({ id: 'item_2', title: 'Item 2', description: 'Desc', durationMinutes: 5 });
      agenda.addItem({ id: 'item_3', title: 'Item 3', description: 'Desc', durationMinutes: 5 });
    });

    it('removes item successfully', () => {
      const result = agenda.removeItem('item_2');

      expect(result).toBe(true);
      expect(agenda.items.size).toBe(2);
      expect(agenda.hasItem('item_2')).toBe(false);
    });

    it('returns false for non-existent item', () => {
      const result = agenda.removeItem('non_existent');

      expect(result).toBe(false);
      expect(agenda.items.size).toBe(3);
    });

    it('clears currentItemId when removing current item', () => {
      agenda.setCurrentItem('item_2');
      expect(agenda.currentItemId).toBe('item_2');

      agenda.removeItem('item_2');

      expect(agenda.currentItemId).toBe('');
    });

    it('reorders remaining items after removal', () => {
      agenda.removeItem('item_2');

      const items = agenda.getSortedItems();
      expect(items).toHaveLength(2);
      expect(items[0].id).toBe('item_1');
      expect(items[0].order).toBe(0);
      expect(items[1].id).toBe('item_3');
      expect(items[1].order).toBe(1);
    });
  });

  describe('updateItem', () => {
    beforeEach(() => {
      agenda.addItem({
        id: 'item_1',
        title: 'Original Title',
        description: 'Original Desc',
        durationMinutes: 5,
      });
    });

    it('updates item fields successfully', () => {
      const result = agenda.updateItem('item_1', {
        title: 'Updated Title',
        description: 'Updated Desc',
        durationMinutes: 10,
      });

      expect(result).toBe(true);
      const item = agenda.getItem('item_1');
      expect(item?.title).toBe('Updated Title');
      expect(item?.description).toBe('Updated Desc');
      expect(item?.durationMinutes).toBe(10);
    });

    it('returns false for non-existent item', () => {
      const result = agenda.updateItem('non_existent', { title: 'New Title' });

      expect(result).toBe(false);
    });

    it('updates only provided fields', () => {
      agenda.updateItem('item_1', { title: 'New Title' });

      const item = agenda.getItem('item_1');
      expect(item?.title).toBe('New Title');
      expect(item?.description).toBe('Original Desc');
      expect(item?.durationMinutes).toBe(5);
    });

    it('can update completed status', () => {
      agenda.updateItem('item_1', { completed: true });

      const item = agenda.getItem('item_1');
      expect(item?.completed).toBe(true);
    });

    it('can update order', () => {
      agenda.updateItem('item_1', { order: 5 });

      const item = agenda.getItem('item_1');
      expect(item?.order).toBe(5);
    });
  });

  describe('completeItem', () => {
    beforeEach(() => {
      agenda.addItem({ id: 'item_1', title: 'Item 1', description: 'Desc', durationMinutes: 5 });
    });

    it('marks item as completed', () => {
      const result = agenda.completeItem('item_1');

      expect(result).toBe(true);
      expect(agenda.getItem('item_1')?.completed).toBe(true);
    });

    it('returns false for non-existent item', () => {
      const result = agenda.completeItem('non_existent');

      expect(result).toBe(false);
    });
  });

  describe('setCurrentItem', () => {
    beforeEach(() => {
      agenda.addItem({ id: 'item_1', title: 'Item 1', description: 'Desc', durationMinutes: 5 });
      agenda.addItem({ id: 'item_2', title: 'Item 2', description: 'Desc', durationMinutes: 5 });
    });

    it('sets current item successfully', () => {
      const result = agenda.setCurrentItem('item_1');

      expect(result).toBe(true);
      expect(agenda.currentItemId).toBe('item_1');
    });

    it('returns false for non-existent item', () => {
      const result = agenda.setCurrentItem('non_existent');

      expect(result).toBe(false);
      expect(agenda.currentItemId).toBe('');
    });

    it('allows clearing current item with empty string', () => {
      agenda.setCurrentItem('item_1');
      expect(agenda.currentItemId).toBe('item_1');

      const result = agenda.setCurrentItem('');

      expect(result).toBe(true);
      expect(agenda.currentItemId).toBe('');
    });

    it('getCurrentItem returns current item', () => {
      agenda.setCurrentItem('item_2');

      const current = agenda.getCurrentItem();

      expect(current?.id).toBe('item_2');
      expect(current?.title).toBe('Item 2');
    });

    it('getCurrentItem returns undefined when no current item', () => {
      const current = agenda.getCurrentItem();

      expect(current).toBeUndefined();
    });
  });

  describe('nextItem', () => {
    beforeEach(() => {
      agenda.addItem({
        id: 'item_1',
        title: 'Item 1',
        description: 'Desc',
        durationMinutes: 5,
        order: 0,
      });
      agenda.addItem({
        id: 'item_2',
        title: 'Item 2',
        description: 'Desc',
        durationMinutes: 5,
        order: 1,
      });
      agenda.addItem({
        id: 'item_3',
        title: 'Item 3',
        description: 'Desc',
        durationMinutes: 5,
        order: 2,
      });
    });

    it('sets first item when no current item', () => {
      const result = agenda.nextItem();

      expect(result).toBe(true);
      expect(agenda.currentItemId).toBe('item_1');
    });

    it('advances to next item', () => {
      agenda.setCurrentItem('item_1');

      const result = agenda.nextItem();

      expect(result).toBe(true);
      expect(agenda.currentItemId).toBe('item_2');
    });

    it('returns false when at last item', () => {
      agenda.setCurrentItem('item_3');

      const result = agenda.nextItem();

      expect(result).toBe(false);
      expect(agenda.currentItemId).toBe('item_3');
    });

    it('returns false when no items', () => {
      const emptyAgenda = new AgendaSchema();

      const result = emptyAgenda.nextItem();

      expect(result).toBe(false);
    });

    it('advances through all items', () => {
      agenda.nextItem();
      expect(agenda.currentItemId).toBe('item_1');

      agenda.nextItem();
      expect(agenda.currentItemId).toBe('item_2');

      agenda.nextItem();
      expect(agenda.currentItemId).toBe('item_3');

      const result = agenda.nextItem();
      expect(result).toBe(false);
    });
  });

  describe('reorderItems', () => {
    beforeEach(() => {
      agenda.addItem({ id: 'item_1', title: 'Item 1', description: 'Desc', durationMinutes: 5 });
      agenda.addItem({ id: 'item_2', title: 'Item 2', description: 'Desc', durationMinutes: 5 });
      agenda.addItem({ id: 'item_3', title: 'Item 3', description: 'Desc', durationMinutes: 5 });
    });

    it('reorders items successfully', () => {
      const result = agenda.reorderItems(['item_3', 'item_1', 'item_2']);

      expect(result).toBe(true);
      const items = agenda.getSortedItems();
      expect(items[0].id).toBe('item_3');
      expect(items[0].order).toBe(0);
      expect(items[1].id).toBe('item_1');
      expect(items[1].order).toBe(1);
      expect(items[2].id).toBe('item_2');
      expect(items[2].order).toBe(2);
    });

    it('returns false when item ID does not exist', () => {
      const result = agenda.reorderItems(['item_3', 'item_1', 'non_existent']);

      expect(result).toBe(false);
    });

    it('returns false when not all items are included', () => {
      const result = agenda.reorderItems(['item_1', 'item_2']);

      expect(result).toBe(false);
    });

    it('returns false when extra items are included', () => {
      const result = agenda.reorderItems(['item_1', 'item_2', 'item_3', 'extra_item']);

      expect(result).toBe(false);
    });
  });

  describe('getSortedItems', () => {
    it('returns items sorted by order', () => {
      agenda.addItem({
        id: 'item_a',
        title: 'Item A',
        description: 'Desc',
        durationMinutes: 5,
        order: 2,
      });
      agenda.addItem({
        id: 'item_b',
        title: 'Item B',
        description: 'Desc',
        durationMinutes: 5,
        order: 0,
      });
      agenda.addItem({
        id: 'item_c',
        title: 'Item C',
        description: 'Desc',
        durationMinutes: 5,
        order: 1,
      });

      const items = agenda.getSortedItems();

      expect(items[0].id).toBe('item_b');
      expect(items[1].id).toBe('item_c');
      expect(items[2].id).toBe('item_a');
    });

    it('returns empty array when no items', () => {
      const items = agenda.getSortedItems();

      expect(items).toEqual([]);
    });
  });

  describe('getItemCount', () => {
    it('returns correct count', () => {
      expect(agenda.getItemCount()).toBe(0);

      agenda.addItem({ title: 'Item 1', description: 'Desc', durationMinutes: 5 });
      expect(agenda.getItemCount()).toBe(1);

      agenda.addItem({ title: 'Item 2', description: 'Desc', durationMinutes: 5 });
      expect(agenda.getItemCount()).toBe(2);
    });
  });

  describe('hasItem', () => {
    it('returns true for existing item', () => {
      agenda.addItem({ id: 'item_1', title: 'Item 1', description: 'Desc', durationMinutes: 5 });

      expect(agenda.hasItem('item_1')).toBe(true);
    });

    it('returns false for non-existent item', () => {
      expect(agenda.hasItem('non_existent')).toBe(false);
    });
  });
});

describe('MeetingRoom Agenda Integration', () => {
  it('MeetingRoomState has initialized agenda', async () => {
    const { MeetingRoomState } =
      await import('../../packages/server/src/schemas/MeetingRoomState.js');
    const state = new MeetingRoomState('meeting_001', 'org_001', 'Test Meeting', 'host_001');

    expect(state.agenda).toBeDefined();
    expect(state.agenda.items).toBeDefined();
    expect(state.agenda.items.size).toBe(0);
  });

  it('MeetingRoom has agenda methods', async () => {
    const { MeetingRoom } = await import('../../packages/server/src/rooms/MeetingRoom.js');
    const room = new MeetingRoom();

    expect(typeof room.addAgendaItem).toBe('function');
    expect(typeof room.removeAgendaItem).toBe('function');
    expect(typeof room.updateAgendaItem).toBe('function');
    expect(typeof room.completeAgendaItem).toBe('function');
    expect(typeof room.setCurrentAgendaItem).toBe('function');
    expect(typeof room.nextAgendaItem).toBe('function');
    expect(typeof room.reorderAgendaItems).toBe('function');
  });
});
