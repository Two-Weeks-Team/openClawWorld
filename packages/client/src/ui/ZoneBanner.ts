import Phaser from 'phaser';
import type { ZoneId } from '@openclawworld/shared';

const ZONE_DISPLAY_NAMES: Record<ZoneId, string> = {
  plaza: 'Central Plaza',
  'north-block': 'North Block',
  'west-block': 'West Block',
  'east-block': 'East Block',
  'south-block': 'South Block',
  lake: 'Lake',
};

const BANNER_DURATION_MS = 2000;
const FADE_DURATION_MS = 300;

export class ZoneBanner {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private currentTween: Phaser.Tweens.Tween | null = null;
  private hideTimeout: NodeJS.Timeout | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(2500);
    this.container.setVisible(false);

    this.background = scene.add.graphics();
    this.text = scene.add.text(0, 0, '', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true,
      },
    });
    this.text.setOrigin(0.5, 0.5);

    this.container.add([this.background, this.text]);

    this.updatePosition();
    scene.scale.on('resize', () => this.updatePosition());
  }

  private updatePosition(): void {
    const centerX = this.scene.cameras.main.width / 2;
    const topY = 80;
    this.container.setPosition(centerX, topY);
  }

  showEnter(zoneId: ZoneId): void {
    const zoneName = ZONE_DISPLAY_NAMES[zoneId] || zoneId;
    this.showBanner(`Entered: ${zoneName}`, 0x2d5a27);
  }

  showLeave(zoneId: ZoneId): void {
    const zoneName = ZONE_DISPLAY_NAMES[zoneId] || zoneId;
    this.showBanner(`Leaving: ${zoneName}`, 0x5a2727);
  }

  private showBanner(message: string, bgColor: number): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    if (this.currentTween) {
      this.currentTween.stop();
      this.currentTween = null;
    }

    this.text.setText(message);

    const padding = 24;
    const width = this.text.width + padding * 2;
    const height = this.text.height + padding;

    this.background.clear();
    this.background.fillStyle(bgColor, 0.85);
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    this.background.lineStyle(2, 0xffffff, 0.3);
    this.background.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    this.container.setAlpha(0);
    this.container.setVisible(true);

    this.currentTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: FADE_DURATION_MS,
      ease: 'Power2',
    });

    this.hideTimeout = setTimeout(() => {
      this.hideBanner();
    }, BANNER_DURATION_MS);
  }

  private hideBanner(): void {
    if (this.currentTween) {
      this.currentTween.stop();
    }

    this.currentTween = this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: FADE_DURATION_MS,
      ease: 'Power2',
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }

  destroy(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    if (this.currentTween) {
      this.currentTween.stop();
    }
    this.container.destroy();
  }
}
