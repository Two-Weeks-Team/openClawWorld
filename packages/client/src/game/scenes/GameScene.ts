import Phaser from 'phaser';
import { gameClient, type Entity, type SchemaMap } from '../../network/ColyseusClient';

export class GameScene extends Phaser.Scene {
  private entities: Map<string, Phaser.GameObjects.Container> = new Map();
  private map?: Phaser.Tilemaps.Tilemap;
  private marker?: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  create() {
    this.createMap();
    this.setupInput();
    this.connectToServer();
  }

  private createMap() {
    this.map = this.make.tilemap({ key: 'lobby' });

    const tileset = this.map.addTilesetImage('tileset', 'tileset');
    if (tileset) {
      this.map.createLayer('ground', tileset, 0, 0);
      this.map.createLayer('collision', tileset, 0, 0);
    }

    this.marker = this.add.graphics();
    this.marker.lineStyle(2, 0xffff00, 1);
    this.marker.strokeRect(0, 0, 32, 32);
    this.marker.setVisible(false);
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.map) return;

      const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const pointerTileX = this.map.worldToTileX(worldPoint.x);
      const pointerTileY = this.map.worldToTileY(worldPoint.y);

      if (pointerTileX !== null && pointerTileY !== null) {
        this.marker?.setPosition(pointerTileX * 32, pointerTileY * 32);
        this.marker?.setVisible(true);

        gameClient.moveTo(pointerTileX, pointerTileY);
      }
    });
  }

  private async connectToServer() {
    const checkRoom = setInterval(() => {
      if (gameClient.currentRoom) {
        clearInterval(checkRoom);
        this.setupRoomListeners();
      }
    }, 100);
  }

  private setupRoomListeners() {
    const room = gameClient.currentRoom;
    if (!room) return;

    room.state.humans.onAdd((entity, key) => this.addEntity(entity, key, 'human'));
    room.state.humans.onRemove((_entity, key) => this.removeEntity(key));

    room.state.agents.onAdd((entity, key) => this.addEntity(entity, key, 'agent'));
    room.state.agents.onRemove((_entity, key) => this.removeEntity(key));

    room.state.objects.onAdd((entity, key) => this.addEntity(entity, key, 'object'));
    room.state.objects.onRemove((_entity, key) => this.removeEntity(key));
  }

  private addEntity(entity: Entity, key: string, type: 'human' | 'agent' | 'object') {
    const container = this.add.container(entity.pos.x, entity.pos.y);

    let texture = 'player-human';
    if (type === 'agent') texture = 'player-agent';
    if (type === 'object') texture = 'player-object';

    const sprite = this.add.sprite(0, 0, texture);
    sprite.setOrigin(0.5, 0.5);

    const text = this.add.text(0, -20, entity.name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 4, y: 2 },
    });
    text.setOrigin(0.5, 0.5);

    container.add([sprite, text]);
    this.entities.set(key, container);
  }

  private removeEntity(key: string) {
    const entity = this.entities.get(key);
    if (entity) {
      entity.destroy();
      this.entities.delete(key);
    }
  }

  update() {
    if (!gameClient.currentRoom) return;

    const room = gameClient.currentRoom;

    this.updateEntities(room.state.humans);
    this.updateEntities(room.state.agents);
    this.updateEntities(room.state.objects);
  }

  private updateEntities(entities: SchemaMap<Entity>) {
    entities.forEach((entity: Entity, key: string) => {
      const container = this.entities.get(key);
      if (container) {
        const t = 0.1;
        container.x = Phaser.Math.Linear(container.x, entity.pos.x, t);
        container.y = Phaser.Math.Linear(container.y, entity.pos.y, t);

        if (key === gameClient.sessionId) {
          (container.list[0] as Phaser.GameObjects.Sprite).setTint(0xffff00);
        }
      }
    });
  }
}
