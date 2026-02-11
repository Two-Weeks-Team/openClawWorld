import Phaser from 'phaser';
import { Callbacks } from '@colyseus/sdk';
import { gameClient, type Entity } from '../../network/ColyseusClient';
import { EventNotificationPanel, EVENT_COLORS } from '../../ui/EventNotificationPanel';
import { Minimap } from '../../ui/Minimap';
import { ZoneBanner } from '../../ui/ZoneBanner';
import { TileInterpreter } from '../../world/TileInterpreter';
import { ClientCollisionSystem } from '../../systems/CollisionSystem';
import type { ZoneId } from '@openclawworld/shared';

interface MapObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Array<{ name: string; type: string; value: unknown }>;
}

interface TiledObjectLayer {
  type: string;
  objects?: MapObject[];
}

export class GameScene extends Phaser.Scene {
  private entities: Map<string, Phaser.GameObjects.Container> = new Map();
  private entityData: Map<string, Entity> = new Map();
  private chatBubbles = new Map<string, Phaser.GameObjects.Container>();
  private mapObjects = new Map<string, Phaser.GameObjects.Sprite>();
  private mapObjectData = new Map<string, MapObject>();
  private map?: Phaser.Tilemaps.Tilemap;
  private marker?: Phaser.GameObjects.Graphics;
  private collisionDebug?: Phaser.GameObjects.Graphics;
  private debugEnabled = false;
  private debugIndicator?: Phaser.GameObjects.Text;
  private interactionPrompt?: Phaser.GameObjects.Container;
  private nearbyObject?: MapObject;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private lastMoveTime = 0;
  private roomCheckInterval?: ReturnType<typeof setInterval>;
  private notificationPanel?: EventNotificationPanel;
  private minimap?: Minimap;
  private zoneBanner?: ZoneBanner;
  private tileInterpreter?: TileInterpreter;
  private clientCollision?: ClientCollisionSystem;
  private previousZone?: ZoneId;
  private chatInputFocused = false;

  constructor() {
    super('GameScene');
  }

  create() {
    this.createMap();
    this.renderMapObjects();
    this.setupInput();
    this.setupDebugToggle();
    this.setupInteractionKey();
    this.createInteractionPrompt();
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

    this.notificationPanel = new EventNotificationPanel(this);
    this.minimap = new Minimap(this);
    this.zoneBanner = new ZoneBanner(this);

    this.tileInterpreter = new TileInterpreter(32);
    this.clientCollision = new ClientCollisionSystem();
    this.initializeWorldGrid();

    this.setupKeyboardFocusHandling();
  }

  private initializeWorldGrid(): void {
    if (!this.map || !this.tileInterpreter || !this.clientCollision) return;

    const groundLayer = this.map.getLayer('ground');
    const collisionLayer = this.map.getLayer('collision');

    if (groundLayer?.data && collisionLayer?.data) {
      const groundData: number[] = [];
      const collisionData: number[] = [];

      groundLayer.data.forEach(row => {
        row.forEach(tile => groundData.push(tile.index));
      });

      collisionLayer.data.forEach(row => {
        row.forEach(tile => collisionData.push(tile.index));
      });

      const worldGrid = this.tileInterpreter.loadFromTiledData(
        this.map.width,
        this.map.height,
        groundData,
        collisionData
      );

      this.clientCollision.setWorldGrid(worldGrid, 32);
    }
  }

  private setupKeyboardFocusHandling(): void {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput) return;

    chatInput.addEventListener('focus', () => {
      this.chatInputFocused = true;
      this.setWasdKeysEnabled(false);
    });

    chatInput.addEventListener('blur', () => {
      this.chatInputFocused = false;
      this.setWasdKeysEnabled(true);
    });
  }

  private setWasdKeysEnabled(enabled: boolean): void {
    if (!this.wasdKeys) return;
    this.wasdKeys.W.enabled = enabled;
    this.wasdKeys.A.enabled = enabled;
    this.wasdKeys.S.enabled = enabled;
    this.wasdKeys.D.enabled = enabled;
  }

  private createMap() {
    this.map = this.make.tilemap({ key: 'village' });

    const tileset = this.map.addTilesetImage('tileset', 'tileset');
    if (tileset) {
      this.map.createLayer('ground', tileset, 0, 0);
      const collisionLayer = this.map.createLayer('collision', tileset, 0, 0);
      if (collisionLayer) {
        collisionLayer.setAlpha(0);
      }
    }

    this.marker = this.add.graphics();
    this.marker.lineStyle(2, 0xffff00, 1);
    this.marker.strokeRect(0, 0, 32, 32);
    this.marker.setVisible(false);
    this.marker.setDepth(100);

    if (this.map) {
      const mapWidth = this.map.widthInPixels;
      const mapHeight = this.map.heightInPixels;
      this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    }
  }

  private renderMapObjects() {
    if (!this.map) return;

    const objectLayer = this.map.getObjectLayer('objects');
    if (!objectLayer) return;

    const objects = (objectLayer as unknown as TiledObjectLayer).objects;
    if (!objects) return;

    for (const obj of objects) {
      const objType = this.getObjectProperty(obj, 'type') as string;
      if (!objType || objType === 'spawn') continue;

      let texture = 'player-object';
      switch (objType) {
        case 'chest':
          texture = 'chest';
          break;
        case 'sign':
          texture = 'sign';
          break;
        case 'portal':
          texture = 'portal';
          break;
        case 'npc':
          texture = 'npc';
          break;
        case 'decoration':
          if (obj.name.includes('fountain')) texture = 'fountain';
          else if (obj.name.includes('lamp')) texture = 'lamp';
          else if (obj.name.includes('bench')) texture = 'bench';
          break;
      }

      const sprite = this.add.sprite(obj.x + 16, obj.y + 16, texture);
      sprite.setDepth(obj.y);

      if (objType === 'portal') {
        this.tweens.add({
          targets: sprite,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      this.mapObjects.set(obj.name, sprite);
      this.mapObjectData.set(obj.name, obj);
    }
  }

  private getObjectProperty(obj: MapObject, propName: string): unknown {
    if (!obj.properties) return obj.type || null;
    const prop = obj.properties.find(p => p.name === propName);
    return prop ? prop.value : null;
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

  private setupInteractionKey() {
    this.input.keyboard?.addKey('E').on('down', () => {
      if (this.nearbyObject) {
        this.handleInteraction(this.nearbyObject);
      }
    });
  }

  private createInteractionPrompt() {
    this.interactionPrompt = this.add.container(0, 0);
    this.interactionPrompt.setDepth(2000);
    this.interactionPrompt.setVisible(false);
    this.interactionPrompt.setScrollFactor(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRoundedRect(-80, -20, 160, 40, 8);

    const text = this.add.text(0, 0, 'Press E to interact', {
      fontSize: '14px',
      color: '#ffffff',
    });
    text.setOrigin(0.5);

    this.interactionPrompt.add([bg, text]);
    this.interactionPrompt.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 60);
  }

  private handleInteraction(obj: MapObject) {
    const objType = this.getObjectProperty(obj, 'type') as string;

    switch (objType) {
      case 'sign': {
        const text = (this.getObjectProperty(obj, 'text') as string) || 'Empty sign';
        this.showMessage(text);
        break;
      }
      case 'chest': {
        const isOpen = this.getObjectProperty(obj, 'isOpen') as string;
        if (isOpen === 'true') {
          this.showMessage('This chest is already open.');
        } else {
          const loot = (this.getObjectProperty(obj, 'loot') as string) || 'nothing';
          this.showMessage(`You found: ${loot}!`);
          const sprite = this.mapObjects.get(obj.name);
          if (sprite) {
            sprite.setTexture('chest-open');
          }
        }
        break;
      }
      case 'portal': {
        const targetMap = (this.getObjectProperty(obj, 'targetMap') as string) || 'unknown';
        this.showMessage(`Portal to: ${targetMap} (not implemented yet)`);
        break;
      }
      case 'npc': {
        const npcName = (this.getObjectProperty(obj, 'name') as string) || 'Stranger';
        const dialogue = (this.getObjectProperty(obj, 'dialogue') as string) || 'Hello there!';
        this.showMessage(`${npcName}: "${dialogue}"`);
        break;
      }
      default:
        this.showMessage(`You examine the ${obj.name}.`);
    }
  }

  private showMessage(text: string) {
    const messageBox = this.add.container(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2
    );
    messageBox.setScrollFactor(0);
    messageBox.setDepth(3000);

    const padding = 20;
    const maxWidth = 400;

    const textObj = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#ffffff',
      wordWrap: { width: maxWidth - padding * 2 },
      align: 'center',
    });
    textObj.setOrigin(0.5);

    const boxWidth = Math.min(maxWidth, textObj.width + padding * 2);
    const boxHeight = textObj.height + padding * 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);
    bg.lineStyle(2, 0x4a90d9, 1);
    bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);

    const closeHint = this.add.text(0, boxHeight / 2 + 20, 'Click to close', {
      fontSize: '12px',
      color: '#888888',
    });
    closeHint.setOrigin(0.5);

    messageBox.add([bg, textObj, closeHint]);

    const closeHandler = () => {
      messageBox.destroy();
      this.input.off('pointerdown', closeHandler);
    };

    this.time.delayedCall(100, () => {
      this.input.on('pointerdown', closeHandler);
    });

    this.time.delayedCall(5000, () => {
      if (messageBox.active) {
        messageBox.destroy();
        this.input.off('pointerdown', closeHandler);
      }
    });
  }

  private updateCollisionDebug() {
    if (!this.collisionDebug) {
      this.collisionDebug = this.add.graphics();
      this.collisionDebug.setDepth(1000);
    }

    this.collisionDebug.clear();

    if (this.debugIndicator) this.debugIndicator.destroy();

    if (this.debugEnabled && this.map) {
      this.debugIndicator = this.add.text(10, 10, 'DEBUG: Collision ON (F3)', {
        fontSize: '12px',
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 },
      });
      this.debugIndicator.setScrollFactor(0);
      this.debugIndicator.setDepth(2000);

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

  private connectToServer() {
    this.roomCheckInterval = setInterval(() => {
      if (gameClient.currentRoom) {
        if (this.roomCheckInterval) {
          clearInterval(this.roomCheckInterval);
          this.roomCheckInterval = undefined;
        }
        this.setupRoomListeners();
      }
    }, 100);
  }

  shutdown() {
    if (this.roomCheckInterval) {
      clearInterval(this.roomCheckInterval);
      this.roomCheckInterval = undefined;
    }
    this.notificationPanel?.destroy();
    this.minimap?.destroy();
    this.zoneBanner?.destroy();
  }

  private setupRoomListeners() {
    const room = gameClient.currentRoom;
    if (!room) return;

    const callbacks = Callbacks.get(room);

    callbacks.onAdd('humans', (entity, key) => {
      this.addEntity(entity, key, 'human');
      callbacks.onChange(entity, () => this.updateEntityData(entity, key));
      if (key !== gameClient.entityId) {
        this.notificationPanel?.addEvent(
          'presence.join',
          `${entity.name} joined`,
          EVENT_COLORS['presence.join']
        );
      }
    });
    callbacks.onRemove('humans', (entity, key) => {
      this.notificationPanel?.addEvent(
        'presence.leave',
        `${entity.name} left`,
        EVENT_COLORS['presence.leave']
      );
      this.removeEntity(key);
    });

    callbacks.onAdd('agents', (entity, key) => {
      this.addEntity(entity, key, 'agent');
      callbacks.onChange(entity, () => this.updateEntityData(entity, key));
      this.notificationPanel?.addEvent(
        'presence.join',
        `Agent ${entity.name} appeared`,
        EVENT_COLORS['presence.join']
      );
    });
    callbacks.onRemove('agents', (entity, key) => {
      this.notificationPanel?.addEvent(
        'presence.leave',
        `Agent ${entity.name} disappeared`,
        EVENT_COLORS['presence.leave']
      );
      this.removeEntity(key);
    });

    callbacks.onAdd('objects', (entity, key) => {
      this.addEntity(entity, key, 'object');
      callbacks.onChange(entity, () => this.updateEntityData(entity, key));
    });
    callbacks.onRemove('objects', (_entity, key) => this.removeEntity(key));

    room.onMessage('chat', (data: { from: string; message: string; entityId: string }) => {
      this.showChatBubble(data.entityId, data.message);
      this.notificationPanel?.addEvent('chat', `${data.from}: ${data.message}`, EVENT_COLORS.chat);
    });
  }

  private updateEntityData(entity: Entity, key: string) {
    this.entityData.set(key, entity);
    this.updateEntityStatus(key, entity);

    if (key === gameClient.entityId) {
      this.checkZoneChange(entity);
    }
  }

  private checkZoneChange(entity: Entity): void {
    const currentZone = (entity as unknown as { currentZone?: ZoneId }).currentZone;
    if (!currentZone) return;

    if (this.previousZone && this.previousZone !== currentZone) {
      this.zoneBanner?.showLeave(this.previousZone);
      this.zoneBanner?.showEnter(currentZone);

      this.notificationPanel?.addEvent(
        'zone.enter',
        `Entered zone: ${currentZone}`,
        EVENT_COLORS['zone.enter']
      );
    } else if (!this.previousZone && currentZone) {
      this.zoneBanner?.showEnter(currentZone);
    }

    this.previousZone = currentZone;
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
    container.setDepth(entity.pos.y);

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

    const statusCircle = this.add.circle(text.width / 2 + 6, -20, 4, 0x00ff00);
    statusCircle.setName('statusIndicator');

    container.add([sprite, text, statusCircle]);
    this.entities.set(key, container);
    this.entityData.set(key, entity);

    this.updateEntityStatus(key, entity);

    if (key === gameClient.entityId) {
      this.cameras.main.startFollow(container, true, 0.1, 0.1);
    }
  }

  private updateEntityStatus(key: string, entity: Entity) {
    const container = this.entities.get(key);
    if (!container) return;

    const statusIndicator = container.getByName('statusIndicator') as Phaser.GameObjects.Arc;
    if (statusIndicator) {
      let color = 0x00ff00;
      switch (entity.status) {
        case 'focus':
          color = 0xffff00;
          break;
        case 'dnd':
          color = 0xff0000;
          break;
        case 'afk':
          color = 0x808080;
          break;
        case 'offline':
          color = 0x000000;
          break;
      }
      statusIndicator.setFillStyle(color);
    }
  }

  private removeEntity(key: string) {
    const entity = this.entities.get(key);
    if (entity) {
      entity.destroy();
      this.entities.delete(key);
      this.entityData.delete(key);
    }
  }

  private handleKeyboardMovement() {
    if (!this.cursors || !this.wasdKeys) return;
    if (document.activeElement?.tagName === 'INPUT') return;
    if (!gameClient.currentRoom || !gameClient.entityId) return;

    const myPlayer = this.entityData.get(gameClient.entityId);
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

  private checkNearbyObjects() {
    if (!gameClient.entityId) return;

    const myEntity = this.entityData.get(gameClient.entityId);
    if (!myEntity) return;

    const playerX = myEntity.pos.x;
    const playerY = myEntity.pos.y;
    const interactionRadius = 64;

    let closestObject: MapObject | undefined;
    let closestDistance = Infinity;

    this.mapObjectData.forEach(obj => {
      const objType = this.getObjectProperty(obj, 'type') as string;
      if (!objType || objType === 'spawn' || objType === 'decoration') return;

      const objCenterX = obj.x + 16;
      const objCenterY = obj.y + 16;
      const distance = Phaser.Math.Distance.Between(playerX, playerY, objCenterX, objCenterY);

      if (distance < interactionRadius && distance < closestDistance) {
        closestObject = obj;
        closestDistance = distance;
      }
    });

    this.nearbyObject = closestObject;

    if (this.interactionPrompt) {
      this.interactionPrompt.setVisible(!!closestObject);
    }
  }

  update(_time: number, delta: number) {
    if (!gameClient.currentRoom) return;

    this.handleKeyboardMovement();
    this.interpolateEntities();
    this.checkNearbyObjects();
    this.notificationPanel?.update(delta);
    this.updateMinimap();
  }

  private updateMinimap(): void {
    if (!this.minimap) return;

    const entities = new Map<string, { x: number; y: number; kind: string }>();
    this.entityData.forEach((entity, id) => {
      entities.set(id, { x: entity.pos.x, y: entity.pos.y, kind: entity.kind });
    });

    this.minimap.updateEntities(entities, gameClient.entityId);
    this.minimap.updateViewport(this.cameras.main);
  }

  private interpolateEntities() {
    this.entityData.forEach((entity, key) => {
      const container = this.entities.get(key);
      if (container) {
        const t = 0.15;
        container.x = Phaser.Math.Linear(container.x, entity.pos.x, t);
        container.y = Phaser.Math.Linear(container.y, entity.pos.y, t);
        container.setDepth(container.y);

        const sprite = container.list[0] as Phaser.GameObjects.Sprite;
        if (entity.facing === 'left') {
          sprite.setFlipX(true);
        } else if (entity.facing === 'right') {
          sprite.setFlipX(false);
        }

        if (key === gameClient.entityId) {
          sprite.setTint(0xffff00);
        }
      }
    });
  }
}
