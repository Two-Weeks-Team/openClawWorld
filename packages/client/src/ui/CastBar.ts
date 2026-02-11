import Phaser from 'phaser';

const BAR_WIDTH = 200;
const BAR_HEIGHT = 20;

export type CastInfo = {
  skillName: string;
  startTime: number;
  completionTime: number;
};

export class CastBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private progressBar: Phaser.GameObjects.Graphics;
  private skillNameText: Phaser.GameObjects.Text;
  private currentCast: CastInfo | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1600);
    this.container.setVisible(false);

    this.background = scene.add.graphics();
    this.background.fillStyle(0x222222, 0.9);
    this.background.fillRoundedRect(-BAR_WIDTH / 2, 0, BAR_WIDTH, BAR_HEIGHT, 4);
    this.background.lineStyle(2, 0x444444, 1);
    this.background.strokeRoundedRect(-BAR_WIDTH / 2, 0, BAR_WIDTH, BAR_HEIGHT, 4);

    this.progressBar = scene.add.graphics();

    this.skillNameText = scene.add.text(0, -18, '', {
      fontSize: '12px',
      color: '#ffffff',
    });
    this.skillNameText.setOrigin(0.5, 0);

    this.container.add([this.background, this.progressBar, this.skillNameText]);
    this.positionBar();
  }

  private positionBar(): void {
    const camera = this.scene.cameras.main;
    this.container.setPosition(camera.width / 2, camera.height / 2 + 80);
  }

  startCast(info: CastInfo): void {
    this.currentCast = info;
    this.skillNameText.setText(info.skillName);
    this.container.setVisible(true);
    this.updateProgress(Date.now());
  }

  cancelCast(): void {
    this.currentCast = null;
    this.container.setVisible(false);
  }

  update(now: number): void {
    if (!this.currentCast) return;

    if (now >= this.currentCast.completionTime) {
      this.cancelCast();
      return;
    }

    this.updateProgress(now);
  }

  private updateProgress(now: number): void {
    if (!this.currentCast) return;

    const { startTime, completionTime } = this.currentCast;
    const totalDuration = completionTime - startTime;
    const elapsed = now - startTime;
    const progress = Math.min(1, Math.max(0, elapsed / totalDuration));

    this.progressBar.clear();
    this.progressBar.fillStyle(0x4488ff, 1);

    const fillWidth = (BAR_WIDTH - 4) * progress;
    this.progressBar.fillRoundedRect(-BAR_WIDTH / 2 + 2, 2, fillWidth, BAR_HEIGHT - 4, 2);
  }

  isCasting(): boolean {
    return this.currentCast !== null;
  }

  destroy(): void {
    this.container.destroy();
  }
}
