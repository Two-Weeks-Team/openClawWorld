import Phaser from 'phaser';

interface MinimapConfig {
  width: number;
  height: number;
  mapWidth: number;
  mapHeight: number;
  backgroundColor: number;
  borderColor: number;
  playerColor: number;
  otherPlayerColor: number;
  agentColor: number;
}

const DEFAULT_CONFIG: MinimapConfig = {
  width: 180,
  height: 146,
  mapWidth: 2048,
  mapHeight: 1664,
  backgroundColor: 0x1a1a2e,
  borderColor: 0x4a90d9,
  playerColor: 0xffff00,
  otherPlayerColor: 0x00ff00,
  agentColor: 0xff00ff,
};

const ZONE_COLORS: Record<string, number> = {
  plaza: 0x808080, // gray - stone plaza
  'north-block': 0x4a90d9, // blue - office
  'west-block': 0xdaa520, // goldenrod - cafe
  'east-block': 0x8b4513, // brown - meeting
  'south-block': 0x9932cc, // purple - arcade
  lake: 0x4169e1, // royal blue - water
  water: 0x3a7ca5,
  road: 0xa88b5a,
};

export class Minimap {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private zoneGraphics: Phaser.GameObjects.Graphics;
  private entityGraphics: Phaser.GameObjects.Graphics;
  private viewportGraphics: Phaser.GameObjects.Graphics;
  private config: MinimapConfig;
  private padding = 10;

  constructor(scene: Phaser.Scene, config?: Partial<MinimapConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    const x = this.padding;
    const y = this.padding;

    this.container = scene.add.container(x, y);
    this.container.setDepth(1500);
    this.container.setScrollFactor(0);

    this.background = scene.add.graphics();
    this.background.fillStyle(this.config.backgroundColor, 0.85);
    this.background.fillRoundedRect(0, 0, this.config.width, this.config.height, 8);
    this.background.lineStyle(2, this.config.borderColor, 1);
    this.background.strokeRoundedRect(0, 0, this.config.width, this.config.height, 8);

    this.zoneGraphics = scene.add.graphics();
    this.entityGraphics = scene.add.graphics();
    this.viewportGraphics = scene.add.graphics();

    this.container.add([
      this.background,
      this.zoneGraphics,
      this.entityGraphics,
      this.viewportGraphics,
    ]);

    this.drawZones();
  }

  private drawZones(): void {
    this.zoneGraphics.clear();

    const scaleX = (this.config.width - 8) / this.config.mapWidth;
    const scaleY = (this.config.height - 8) / this.config.mapHeight;
    const offsetX = 4;
    const offsetY = 4;

    this.zoneGraphics.fillStyle(ZONE_COLORS.water, 0.8);
    for (let y = 0; y < 3; y++) {
      this.zoneGraphics.fillRect(
        offsetX,
        offsetY + y * 32 * scaleY,
        this.config.width - 8,
        32 * scaleY
      );
    }
    for (let y = 3; y < 20; y++) {
      this.zoneGraphics.fillRect(offsetX, offsetY + y * 32 * scaleY, 5 * 32 * scaleX, 32 * scaleY);
    }

    this.zoneGraphics.fillStyle(ZONE_COLORS.road, 0.6);
    this.zoneGraphics.fillRect(
      offsetX + 17 * 32 * scaleX,
      offsetY + 12 * 32 * scaleY,
      23 * 32 * scaleX,
      4 * 32 * scaleY
    );
    this.zoneGraphics.fillRect(
      offsetX + 17 * 32 * scaleX,
      offsetY + 16 * 32 * scaleY,
      4 * 32 * scaleX,
      22 * 32 * scaleY
    );
    this.zoneGraphics.fillRect(
      offsetX + 37 * 32 * scaleX,
      offsetY + 18 * 32 * scaleY,
      3 * 32 * scaleX,
      15 * 32 * scaleY
    );
    this.zoneGraphics.fillRect(
      offsetX + 17 * 32 * scaleX,
      offsetY + 36 * 32 * scaleY,
      41 * 32 * scaleX,
      14 * 32 * scaleY
    );

    const zones = [
      { id: 'plaza', x: 768, y: 768, w: 512, h: 512 },
      { id: 'north-block', x: 576, y: 64, w: 768, h: 384 },
      { id: 'west-block', x: 64, y: 704, w: 640, h: 640 },
      { id: 'east-block', x: 1472, y: 704, w: 576, h: 640 },
      { id: 'south-block', x: 576, y: 1472, w: 768, h: 384 },
      { id: 'lake', x: 1408, y: 1408, w: 640, h: 640 },
    ];

    for (const zone of zones) {
      const color = ZONE_COLORS[zone.id] || 0x333333;
      this.zoneGraphics.fillStyle(color, 0.6);
      this.zoneGraphics.fillRect(
        offsetX + zone.x * scaleX,
        offsetY + zone.y * scaleY,
        zone.w * scaleX,
        zone.h * scaleY
      );

      this.zoneGraphics.lineStyle(1, 0xffffff, 0.3);
      this.zoneGraphics.strokeRect(
        offsetX + zone.x * scaleX,
        offsetY + zone.y * scaleY,
        zone.w * scaleX,
        zone.h * scaleY
      );
    }
  }

  updateEntities(
    entities: Map<string, { x: number; y: number; kind: string }>,
    myEntityId?: string
  ): void {
    this.entityGraphics.clear();

    const scaleX = (this.config.width - 8) / this.config.mapWidth;
    const scaleY = (this.config.height - 8) / this.config.mapHeight;
    const offsetX = 4;
    const offsetY = 4;

    entities.forEach((entity, id) => {
      let color = this.config.otherPlayerColor;

      if (id === myEntityId) {
        color = this.config.playerColor;
      } else if (entity.kind === 'agent') {
        color = this.config.agentColor;
      }

      const x = offsetX + entity.x * scaleX;
      const y = offsetY + entity.y * scaleY;

      if (id === myEntityId) {
        this.entityGraphics.fillStyle(color, 1);
        this.entityGraphics.fillCircle(x, y, 4);
        this.entityGraphics.lineStyle(1, 0x000000, 1);
        this.entityGraphics.strokeCircle(x, y, 4);
      } else {
        this.entityGraphics.fillStyle(color, 0.8);
        this.entityGraphics.fillCircle(x, y, 3);
      }
    });
  }

  updateViewport(camera: Phaser.Cameras.Scene2D.Camera): void {
    this.viewportGraphics.clear();

    const scaleX = (this.config.width - 8) / this.config.mapWidth;
    const scaleY = (this.config.height - 8) / this.config.mapHeight;
    const offsetX = 4;
    const offsetY = 4;

    const viewX = offsetX + camera.scrollX * scaleX;
    const viewY = offsetY + camera.scrollY * scaleY;
    const viewW = camera.width * scaleX;
    const viewH = camera.height * scaleY;

    this.viewportGraphics.lineStyle(1, 0xffffff, 0.8);
    this.viewportGraphics.strokeRect(viewX, viewY, viewW, viewH);
  }

  show(): void {
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  destroy(): void {
    this.container.destroy();
  }
}
