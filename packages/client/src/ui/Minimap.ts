import Phaser from 'phaser';
import {
  ZONE_BOUNDS,
  ZONE_COLORS,
  MAP_CONFIG,
  ZONE_IDS,
  type WorldGrid,
  type TileType,
} from '@openclawworld/shared';

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
  height: 180,
  mapWidth: MAP_CONFIG.pixelWidth,
  mapHeight: MAP_CONFIG.pixelHeight,
  backgroundColor: 0x1a1a2e,
  borderColor: 0x4a90d9,
  playerColor: 0xffff00,
  otherPlayerColor: 0x00ff00,
  agentColor: 0xff00ff,
};

const TERRAIN_COLORS: Partial<Record<TileType, number>> = {
  water: 0x3a7ca5,
  road: 0xa88b5a,
  grass: 0x4a8c4a,
  wall: 0x5a5a5a,
};

export class Minimap {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private terrainGraphics: Phaser.GameObjects.Graphics;
  private zoneGraphics: Phaser.GameObjects.Graphics;
  private entityGraphics: Phaser.GameObjects.Graphics;
  private viewportGraphics: Phaser.GameObjects.Graphics;
  private config: MinimapConfig;
  private padding = 10;
  private worldGrid: WorldGrid | null = null;
  private tileSize = 16;

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

    this.terrainGraphics = scene.add.graphics();
    this.zoneGraphics = scene.add.graphics();
    this.entityGraphics = scene.add.graphics();
    this.viewportGraphics = scene.add.graphics();

    this.container.add([
      this.background,
      this.terrainGraphics,
      this.zoneGraphics,
      this.entityGraphics,
      this.viewportGraphics,
    ]);

    this.drawZoneBounds();
  }

  setWorldGrid(grid: WorldGrid, tileSize = 16): void {
    this.worldGrid = grid;
    this.tileSize = tileSize;
    this.drawTerrain();
  }

  private drawTerrain(): void {
    this.terrainGraphics.clear();

    if (!this.worldGrid || this.worldGrid.length === 0) return;

    const gridHeight = this.worldGrid.length;
    const gridWidth = this.worldGrid[0].length;
    const pixelWidth = gridWidth * this.tileSize;
    const pixelHeight = gridHeight * this.tileSize;

    const scaleX = (this.config.width - 8) / pixelWidth;
    const scaleY = (this.config.height - 8) / pixelHeight;
    const offsetX = 4;
    const offsetY = 4;

    const tileW = this.tileSize * scaleX;
    const tileH = this.tileSize * scaleY;

    for (let ty = 0; ty < gridHeight; ty++) {
      for (let tx = 0; tx < gridWidth; tx++) {
        const tile = this.worldGrid[ty][tx];
        const color = TERRAIN_COLORS[tile.type];

        if (color !== undefined) {
          this.terrainGraphics.fillStyle(color, 0.7);
          this.terrainGraphics.fillRect(offsetX + tx * tileW, offsetY + ty * tileH, tileW, tileH);
        }
      }
    }
  }

  private drawZoneBounds(): void {
    this.zoneGraphics.clear();

    const scaleX = (this.config.width - 8) / this.config.mapWidth;
    const scaleY = (this.config.height - 8) / this.config.mapHeight;
    const offsetX = 4;
    const offsetY = 4;

    for (const zoneId of ZONE_IDS) {
      const bounds = ZONE_BOUNDS[zoneId];
      const color = ZONE_COLORS[zoneId];
      this.zoneGraphics.fillStyle(color, 0.6);
      this.zoneGraphics.fillRect(
        offsetX + bounds.x * scaleX,
        offsetY + bounds.y * scaleY,
        bounds.width * scaleX,
        bounds.height * scaleY
      );

      this.zoneGraphics.lineStyle(1, 0xffffff, 0.3);
      this.zoneGraphics.strokeRect(
        offsetX + bounds.x * scaleX,
        offsetY + bounds.y * scaleY,
        bounds.width * scaleX,
        bounds.height * scaleY
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

    const worldViewWidth = camera.zoom > 0 ? camera.width / camera.zoom : 0;
    const worldViewHeight = camera.zoom > 0 ? camera.height / camera.zoom : 0;

    const viewX = offsetX + camera.scrollX * scaleX;
    const viewY = offsetY + camera.scrollY * scaleY;
    const viewW = worldViewWidth * scaleX;
    const viewH = worldViewHeight * scaleY;

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
