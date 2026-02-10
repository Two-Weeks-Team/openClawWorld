import Phaser from 'phaser';
import { gameClient, type Entity, type SchemaMap } from '../../network/ColyseusClient';

export class GameScene extends Phaser.Scene {
  private entities: Map<string, Phaser.GameObjects.Container> = new Map();
  private chatBubbles = new Map<string, Phaser.GameObjects.Container>();
  private map?: Phaser.Tilemaps.Tilemap;
  private marker?: Phaser.GameObjects.Graphics;
  private collisionDebug?: Phaser.GameObjects.Graphics;
  private debugEnabled = false;
  private debugIndicator?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private lastMoveTime = 0;

  constructor() {
    super('GameScene');
  }

  create() {
    this.createMap();
    this.setupInput();
    this.setupDebugToggle();
    this.connectToServer();

    this.cursors = this.input.keyboard?.createCursorKeys();
    if (this.input.keyboard) {
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }
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

  private setupDebugToggle() {
    this.input.keyboard?.addKey('F3').on('down', () => {
      this.debugEnabled = !this.debugEnabled;
      this.updateCollisionDebug();
    });
  }

  private updateCollisionDebug() {
    if (!this.collisionDebug) {
      this.collisionDebug = this.add.graphics();
      this.collisionDebug.setDepth(1000);
    }

    this.collisionDebug.clear();

    // Toggle indicator
    if (this.debugIndicator) this.debugIndicator.destroy();

    if (this.debugEnabled && this.map) {
      // Show indicator
      this.debugIndicator = this.add.text(10, 10, 'DEBUG: Collision ON (F3)', {
        fontSize: '12px',
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
      });
      this.debugIndicator.setScrollFactor(0);
      this.debugIndicator.setDepth(2000);

      // Draw collision tiles
      const collisionLayer = this.map.getLayer('collision');
      if (collisionLayer) {
        collisionLayer.data.forEach((row, y) => {
          row.forEach((tile, x) => {
            if (tile.index > 0) {
              this.collisionDebug?.fillStyle(0xff0000, 0.3);
              this.collisionDebug?.fillRect(x * 32, y * 32, 32, 32);
            }
          });
        });
      }
    }
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

    room.onMessage('chat', (data: { from: string; message: string; entityId: string }) => {
      this.showChatBubble(data.entityId, data.message);
    });
  }

  private showChatBubble(entityId: string, message: string) {
    const entityContainer = this.entities.get(entityId);
    if (!entityContainer) return;

    this.chatBubbles.get(entityId)?.destroy();

    const bubble = this.add.container(0, -50);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.9);
    bg.lineStyle(2, 0x000000, 1);

    const text = this.add.text(0, 0, message, {
      fontSize: '11px',
      color: '#000000',
      wordWrap: { width: 120 },
      align: 'center',
    });
    text.setOrigin(0.5);

    const padding = 8;
    const width = text.width + padding * 2;
    const height = text.height + padding * 2;
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    bubble.add([bg, text]);
    entityContainer.add(bubble);
    this.chatBubbles.set(entityId, bubble);

    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: bubble,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          bubble.destroy();
          this.chatBubbles.delete(entityId);
        },
      });
    });
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

  private handleKeyboardMovement() {
    if (!this.cursors || !this.wasdKeys) return;

    if (document.activeElement?.tagName === 'INPUT') return;

    const room = gameClient.currentRoom;
    if (!room) return;

    const myPlayer = room.state.humans.get(gameClient.sessionId!);
    if (!myPlayer || !myPlayer.tile) return;

    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) dx = -1;
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) dx = 1;
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) dy = -1;
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      const now = this.time.now;
      if (now - this.lastMoveTime > 150) {
        gameClient.moveTo(myPlayer.tile.tx + dx, myPlayer.tile.ty + dy);
        this.lastMoveTime = now;
      }
    }
  }

  update() {
    if (!gameClient.currentRoom) return;

    this.handleKeyboardMovement();

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

        if (entity.facing === 'left') {
          (container.list[0] as Phaser.GameObjects.Sprite).setFlipX(true);
        } else if (entity.facing === 'right') {
          (container.list[0] as Phaser.GameObjects.Sprite).setFlipX(false);
        }

        if (key === gameClient.sessionId) {
          (container.list[0] as Phaser.GameObjects.Sprite).setTint(0xffff00);
        }
      }
    });
  }
}
