import Phaser from 'phaser';
import { EMOTE_DISPLAY_DURATION_MS, EMOTE_FADE_DURATION_MS } from '@openclawworld/shared';

export class EmoteDisplay {
  private scene: Phaser.Scene;
  private activeEmotes: Map<
    string,
    { container: Phaser.GameObjects.Container; timer: Phaser.Time.TimerEvent }
  > = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  showEmote(entityId: string, parent: Phaser.GameObjects.Container, emoteType: string): void {
    this.removeEmote(entityId);
    const bubble = this.scene.add.container(0, -32);
    bubble.setAlpha(0);
    const bg = this.scene.add.graphics();
    bg.fillStyle(0xffffff, 0.85);
    bg.fillCircle(0, 0, 12);
    bg.lineStyle(1, 0x000000, 0.4);
    bg.strokeCircle(0, 0, 12);
    const sprite = this.scene.add.sprite(0, 0, 'emotes', emoteType);
    sprite.setOrigin(0.5, 0.5);
    sprite.setDisplaySize(14, 14);
    bubble.add([bg, sprite]);
    parent.add(bubble);
    this.scene.tweens.add({ targets: bubble, alpha: 1, duration: 150, ease: 'Quad.easeOut' });
    const timer = this.scene.time.delayedCall(EMOTE_DISPLAY_DURATION_MS, () => {
      this.scene.tweens.add({
        targets: bubble,
        alpha: 0,
        duration: EMOTE_FADE_DURATION_MS,
        ease: 'Quad.easeIn',
        onComplete: () => {
          bubble.destroy();
          this.activeEmotes.delete(entityId);
        },
      });
    });
    this.activeEmotes.set(entityId, { container: bubble, timer });
  }

  removeEmote(entityId: string): void {
    const existing = this.activeEmotes.get(entityId);
    if (existing) {
      existing.timer.destroy();
      existing.container.destroy();
      this.activeEmotes.delete(entityId);
    }
  }

  destroy(): void {
    this.activeEmotes.forEach(({ container, timer }) => {
      timer.destroy();
      container.destroy();
    });
    this.activeEmotes.clear();
  }
}
