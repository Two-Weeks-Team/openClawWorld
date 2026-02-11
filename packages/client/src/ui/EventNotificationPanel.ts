import Phaser from 'phaser';

interface EventEntry {
  id: string;
  type: string;
  message: string;
  color: number;
  createdAt: number;
  alpha: number;
}

export const EVENT_COLORS = {
  'zone.enter': 0x00ff00,
  'zone.exit': 0xff6600,
  'presence.join': 0x00ffff,
  'presence.leave': 0xff0000,
  chat: 0xffffff,
  system: 0xffff00,
} as const;

export class EventNotificationPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;
  private events: EventEntry[] = [];
  private textObjects: Map<string, Phaser.GameObjects.Text> = new Map();
  private maxEvents: number = 8;
  private fadeTime: number = 10000;
  private panelWidth: number = 300;
  private panelHeight: number = 200;
  private padding: number = 10;
  private lineHeight: number = 20;
  private eventCounter: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const x = scene.cameras.main.width - this.panelWidth - 10;
    const y = 10;

    this.container = scene.add.container(x, y);
    this.container.setDepth(1500);
    this.container.setScrollFactor(0);

    this.background = scene.add.rectangle(
      this.panelWidth / 2,
      this.panelHeight / 2,
      this.panelWidth,
      this.panelHeight,
      0x000000,
      0.7
    );
    this.background.setOrigin(0.5);

    this.container.add(this.background);
  }

  addEvent(type: string, message: string, color?: number): void {
    const eventColor = color ?? EVENT_COLORS[type as keyof typeof EVENT_COLORS] ?? 0xffffff;
    const id = `event_${++this.eventCounter}`;

    const entry: EventEntry = {
      id,
      type,
      message,
      color: eventColor,
      createdAt: Date.now(),
      alpha: 1,
    };

    this.events.unshift(entry);

    if (this.events.length > this.maxEvents) {
      const removed = this.events.pop();
      if (removed) {
        const textObj = this.textObjects.get(removed.id);
        if (textObj) {
          textObj.destroy();
          this.textObjects.delete(removed.id);
        }
      }
    }

    this.renderEvents();
  }

  private renderEvents(): void {
    this.textObjects.forEach(textObj => textObj.destroy());
    this.textObjects.clear();

    this.events.forEach((event, index) => {
      const y = this.padding + index * this.lineHeight;

      const text = this.scene.add.text(this.padding, y, event.message, {
        fontSize: '12px',
        color: `#${event.color.toString(16).padStart(6, '0')}`,
        wordWrap: { width: this.panelWidth - this.padding * 2 },
      });
      text.setAlpha(event.alpha);

      this.container.add(text);
      this.textObjects.set(event.id, text);
    });
  }

  update(_delta: number): void {
    const now = Date.now();
    let needsRender = false;

    this.events = this.events.filter(event => {
      const age = now - event.createdAt;

      if (age > this.fadeTime) {
        const fadeProgress = Math.min((age - this.fadeTime) / 2000, 1);
        event.alpha = 1 - fadeProgress;

        const textObj = this.textObjects.get(event.id);
        if (textObj) {
          textObj.setAlpha(event.alpha);
        }

        if (event.alpha <= 0) {
          const textObj = this.textObjects.get(event.id);
          if (textObj) {
            textObj.destroy();
            this.textObjects.delete(event.id);
          }
          needsRender = true;
          return false;
        }
      }

      return true;
    });

    if (needsRender) {
      this.renderEvents();
    }
  }

  clear(): void {
    this.events = [];
    this.textObjects.forEach(textObj => textObj.destroy());
    this.textObjects.clear();
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.clear();
    this.container.destroy();
  }
}
