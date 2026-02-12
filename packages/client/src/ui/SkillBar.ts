import Phaser from 'phaser';
import type { SkillDefinition } from '@openclawworld/shared';

export type SkillSlot = {
  definition: SkillDefinition;
  lastUsedTime: number;
  enabled: boolean;
};

const SLOT_SIZE = 56;
const SLOT_PADDING = 6;
const COOLDOWN_OVERLAY_ALPHA = 0.7;

export class SkillBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private slots: Map<
    number,
    {
      bg: Phaser.GameObjects.Graphics;
      icon: Phaser.GameObjects.Text;
      cooldownOverlay: Phaser.GameObjects.Graphics;
      keyLabel: Phaser.GameObjects.Text;
      skill?: SkillSlot;
    }
  > = new Map();
  private maxSlots = 4;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(1500);
    this.createSlots();
    this.positionBar();
  }

  private createSlots(): void {
    for (let i = 0; i < this.maxSlots; i++) {
      const x = i * (SLOT_SIZE + SLOT_PADDING);

      const bg = this.scene.add.graphics();
      bg.fillStyle(0x222222, 0.9);
      bg.fillRoundedRect(x, 0, SLOT_SIZE, SLOT_SIZE, 6);
      bg.lineStyle(2, 0x444444, 1);
      bg.strokeRoundedRect(x, 0, SLOT_SIZE, SLOT_SIZE, 6);

      const icon = this.scene.add.text(x + SLOT_SIZE / 2, SLOT_SIZE / 2, '', {
        fontSize: `${SLOT_SIZE / 2}px`,
      });
      icon.setOrigin(0.5);

      const cooldownOverlay = this.scene.add.graphics();
      cooldownOverlay.setVisible(false);

      const keyLabel = this.scene.add.text(x + SLOT_PADDING, SLOT_PADDING, `${i + 1}`, {
        fontSize: '12px',
        color: '#aaaaaa',
      });

      this.container.add([bg, icon, cooldownOverlay, keyLabel]);
      this.slots.set(i, { bg, icon, cooldownOverlay, keyLabel });
    }
  }

  private positionBar(): void {
    const camera = this.scene.cameras.main;
    const totalWidth = this.maxSlots * (SLOT_SIZE + SLOT_PADDING) - SLOT_PADDING;
    this.container.setPosition((camera.width - totalWidth) / 2, camera.height - SLOT_SIZE - 20);
  }

  setSkill(slotIndex: number, skill: SkillSlot | undefined): void {
    const slot = this.slots.get(slotIndex);
    if (!slot) return;

    slot.skill = skill;
    if (skill) {
      slot.icon.setText(skill.definition.emoji || '⚡');
      slot.bg.clear();
      slot.bg.fillStyle(skill.enabled ? 0x333366 : 0x222222, 0.9);
      const x = slotIndex * (SLOT_SIZE + SLOT_PADDING);
      slot.bg.fillRoundedRect(x, 0, SLOT_SIZE, SLOT_SIZE, 6);
      slot.bg.lineStyle(2, skill.enabled ? 0x6666aa : 0x444444, 1);
      slot.bg.strokeRoundedRect(x, 0, SLOT_SIZE, SLOT_SIZE, 6);
    } else {
      slot.icon.setText('');
      slot.bg.clear();
      const x = slotIndex * (SLOT_SIZE + SLOT_PADDING);
      slot.bg.fillStyle(0x222222, 0.9);
      slot.bg.fillRoundedRect(x, 0, SLOT_SIZE, SLOT_SIZE, 6);
      slot.bg.lineStyle(2, 0x444444, 1);
      slot.bg.strokeRoundedRect(x, 0, SLOT_SIZE, SLOT_SIZE, 6);
    }
  }

  getSkill(slotIndex: number): SkillSlot | undefined {
    return this.slots.get(slotIndex)?.skill;
  }

  update(now: number): void {
    this.slots.forEach((slot, index) => {
      if (!slot.skill) {
        slot.cooldownOverlay.setVisible(false);
        return;
      }

      const action = slot.skill.definition.actions[0];
      const cooldownMs = action?.cooldownMs ?? 0;
      if (cooldownMs <= 0) {
        slot.cooldownOverlay.setVisible(false);
        return;
      }

      const elapsed = now - slot.skill.lastUsedTime;
      const remaining = Math.max(0, cooldownMs - elapsed);

      if (remaining > 0) {
        const fraction = remaining / cooldownMs;
        this.drawCooldownOverlay(slot.cooldownOverlay, index, fraction);
        slot.cooldownOverlay.setVisible(true);
      } else {
        slot.cooldownOverlay.setVisible(false);
      }
    });
  }

  private drawCooldownOverlay(
    graphics: Phaser.GameObjects.Graphics,
    slotIndex: number,
    fraction: number
  ): void {
    graphics.clear();
    graphics.fillStyle(0x000000, COOLDOWN_OVERLAY_ALPHA);

    const x = slotIndex * (SLOT_SIZE + SLOT_PADDING);
    const centerX = x + SLOT_SIZE / 2;
    const centerY = SLOT_SIZE / 2;
    const radius = SLOT_SIZE / 2 - 2;

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + fraction * Math.PI * 2;

    graphics.beginPath();
    graphics.moveTo(centerX, centerY);
    graphics.arc(centerX, centerY, radius, startAngle, endAngle, false);
    graphics.closePath();
    graphics.fillPath();
  }

  highlightSlot(slotIndex: number, highlight: boolean): void {
    const slot = this.slots.get(slotIndex);
    if (!slot) return;

    const x = slotIndex * (SLOT_SIZE + SLOT_PADDING);
    slot.bg.clear();
    slot.bg.fillStyle(highlight ? 0x446644 : slot.skill?.enabled ? 0x333366 : 0x222222, 0.9);
    slot.bg.fillRoundedRect(x, 0, SLOT_SIZE, SLOT_SIZE, 6);
    slot.bg.lineStyle(2, highlight ? 0x88ff88 : slot.skill?.enabled ? 0x6666aa : 0x444444, 1);
    slot.bg.strokeRoundedRect(x, 0, SLOT_SIZE, SLOT_SIZE, 6);
  }

  destroy(): void {
    this.container.destroy();
  }
}
