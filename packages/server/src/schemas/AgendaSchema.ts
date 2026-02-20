import { randomUUID } from 'crypto';
import { Schema, type, MapSchema } from '@colyseus/schema';

export interface AgendaItemData {
  id?: string;
  title: string;
  description: string;
  durationMinutes: number;
  completed?: boolean;
  order?: number;
}

export class AgendaItemSchema extends Schema {
  @type('string')
  id: string = '';

  @type('string')
  title: string = '';

  @type('string')
  description: string = '';

  @type('number')
  durationMinutes: number = 0;

  @type('boolean')
  completed: boolean = false;

  @type('number')
  order: number = 0;

  constructor(data?: AgendaItemData) {
    super();
    if (data) {
      if (data.id !== undefined) this.id = data.id;
      if (data.title !== undefined) this.title = data.title;
      if (data.description !== undefined) this.description = data.description;
      if (data.durationMinutes !== undefined) this.durationMinutes = data.durationMinutes;
      if (data.completed !== undefined) this.completed = data.completed;
      if (data.order !== undefined) this.order = data.order;
    }
  }
}

export class AgendaSchema extends Schema {
  @type({ map: AgendaItemSchema })
  items: MapSchema<AgendaItemSchema> = new MapSchema<AgendaItemSchema>();

  @type('string')
  currentItemId: string = '';

  constructor() {
    super();
  }

  addItem(data: AgendaItemData): string {
    const id = data.id ?? this.generateId();
    const order = data.order ?? this.items.size;
    const item = new AgendaItemSchema({ ...data, id, order });
    this.items.set(id, item);
    return id;
  }

  removeItem(itemId: string): boolean {
    if (!this.items.has(itemId)) {
      return false;
    }

    this.items.delete(itemId);

    // If the removed item was the current item, clear it
    if (this.currentItemId === itemId) {
      this.currentItemId = '';
    }

    // Reorder remaining items to maintain consecutive order
    this.reorderAllItems();

    return true;
  }

  updateItem(itemId: string, updates: Partial<AgendaItemData>): boolean {
    const item = this.items.get(itemId);
    if (!item) {
      return false;
    }

    if (updates.title !== undefined) item.title = updates.title;
    if (updates.description !== undefined) item.description = updates.description;
    if (updates.durationMinutes !== undefined) item.durationMinutes = updates.durationMinutes;
    if (updates.completed !== undefined) item.completed = updates.completed;
    if (updates.order !== undefined) item.order = updates.order;

    return true;
  }

  completeItem(itemId: string): boolean {
    const item = this.items.get(itemId);
    if (!item) {
      return false;
    }

    item.completed = true;
    return true;
  }

  setCurrentItem(itemId: string): boolean {
    if (itemId !== '' && !this.items.has(itemId)) {
      return false;
    }

    this.currentItemId = itemId;
    return true;
  }

  nextItem(): boolean {
    const sortedItems = this.getSortedItems();

    if (sortedItems.length === 0) {
      this.currentItemId = '';
      return false;
    }

    // If no current item, set to first item
    if (this.currentItemId === '') {
      this.currentItemId = sortedItems[0].id;
      return true;
    }

    // Find current item index
    const currentIndex = sortedItems.findIndex(item => item.id === this.currentItemId);
    if (currentIndex === -1 || currentIndex >= sortedItems.length - 1) {
      // Current item not found or is the last item
      return false;
    }

    // Move to next item
    this.currentItemId = sortedItems[currentIndex + 1].id;
    return true;
  }

  reorderItems(itemIds: string[]): boolean {
    // Validate all item IDs exist
    for (const id of itemIds) {
      if (!this.items.has(id)) {
        return false;
      }
    }

    // Validate all items are included
    if (itemIds.length !== this.items.size) {
      return false;
    }

    // Update order for each item
    itemIds.forEach((id, index) => {
      const item = this.items.get(id);
      if (item) {
        item.order = index;
      }
    });

    return true;
  }

  getItem(itemId: string): AgendaItemSchema | undefined {
    return this.items.get(itemId);
  }

  getCurrentItem(): AgendaItemSchema | undefined {
    if (this.currentItemId === '') {
      return undefined;
    }
    return this.items.get(this.currentItemId);
  }

  getSortedItems(): AgendaItemSchema[] {
    const items: AgendaItemSchema[] = [];
    this.items.forEach(item => items.push(item));
    return items.sort((a, b) => a.order - b.order);
  }

  getItemCount(): number {
    return this.items.size;
  }

  hasItem(itemId: string): boolean {
    return this.items.has(itemId);
  }

  private generateId(): string {
    return `agenda_item_${randomUUID()}`;
  }

  private reorderAllItems(): void {
    const sortedItems = this.getSortedItems();
    sortedItems.forEach((item, index) => {
      item.order = index;
    });
  }
}
