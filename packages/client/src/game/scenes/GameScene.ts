import Phaser from 'phaser';
import { Callbacks } from '@colyseus/sdk';
import { gameClient, type Entity } from '../../network/ColyseusClient';
import { EventNotificationPanel, EVENT_COLORS } from '../../ui/EventNotificationPanel';
import { Minimap } from '../../ui/Minimap';
import { ZoneBanner } from '../../ui/ZoneBanner';
import { TileInterpreter } from '../../world/TileInterpreter';
import { ClientCollisionSystem } from '../../systems/CollisionSystem';
import { SkillBar, type SkillSlot } from '../../ui/SkillBar';
import { CastBar } from '../../ui/CastBar';
import type { ZoneId, SkillDefinition } from '@openclawworld/shared';
import { ZONE_BOUNDS, ZONE_COLORS, DEBUG_COLORS, DEFAULT_SPAWN_POINT } from '@openclawworld/shared';

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
  private zoneDebug?: Phaser.GameObjects.Graphics;
  private debugEnabled = false;
  private debugIndicator?: Phaser.GameObjects.Text;
  private debugInfoPanel?: Phaser.GameObjects.Container;
  private debugLegend?: Phaser.GameObjects.Container;
  private debugZoneLabels: Phaser.GameObjects.Text[] = [];
  private zoneNameLabels: Phaser.GameObjects.Text[] = [];
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
  private previousZone: ZoneId | null = null;
  private chatInputFocused = false;
  private skillBar?: SkillBar;
  private castBar?: CastBar;
  private skillKeys?: Phaser.Input.Keyboard.Key[];
  private targetingMode = false;
  private selectedSkillSlot: number | null = null;
  private entityEffects: Map<string, Set<string>> = new Map();
  private builtinSkills: SkillDefinition[] = [];
  private _debugBlockedCount = 0;
  private debugInfoTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('GameScene');
  }

  create() {
    this.createMap();
    this.renderMapObjects();
    this.createZoneNameLabels();
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
    this.skillBar = new SkillBar(this);
    this.castBar = new CastBar(this);

    this.tileInterpreter = new TileInterpreter(32);
    this.clientCollision = new ClientCollisionSystem();
    this.initializeWorldGrid();

    this.setupSkillKeys();
    this.setupSkillTargeting();
    this.initializeBuiltinSkills();

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

  private setupSkillKeys(): void {
    if (!this.input.keyboard) return;

    this.skillKeys = [
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
    ];

    this.skillKeys.forEach((key, index) => {
      key.on('down', () => {
        if (this.chatInputFocused) return;
        this.activateSkillSlot(index);
      });
    });

    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      this.cancelTargeting();
    });
  }

  private setupSkillTargeting(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.targetingMode || this.selectedSkillSlot === null) return;
      if (!this.skillBar) return;

      const skill = this.skillBar.getSkill(this.selectedSkillSlot);
      if (!skill) return;

      const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const targetEntity = this.findEntityAtPosition(worldPoint.x, worldPoint.y);

      if (targetEntity) {
        this.invokeSkillOnTarget(skill, targetEntity);
      }

      this.cancelTargeting();
    });
  }

  private initializeBuiltinSkills(): void {
    this.builtinSkills = [
      {
        id: 'slow_aura',
        name: 'Slow Aura',
        version: '1.0.0',
        description: 'Emit an aura that slows nearby targets',
        category: 'social',
        emoji: '🐌',
        source: { type: 'builtin' },
        actions: [
          {
            id: 'cast',
            name: 'Cast Slow Aura',
            description: 'Apply a slowing effect to target within range',
            cooldownMs: 5000,
            castTimeMs: 1000,
            rangeUnits: 200,
            effect: {
              id: 'slowed',
              durationMs: 3000,
              statModifiers: { speedMultiplier: 0.5 },
            },
          },
        ],
        triggers: ['slow', 'aura'],
      },
    ];

    if (this.skillBar && this.builtinSkills.length > 0) {
      this.skillBar.setSkill(0, {
        definition: this.builtinSkills[0],
        lastUsedTime: 0,
        enabled: true,
      });
    }
  }

  private activateSkillSlot(slotIndex: number): void {
    if (!this.skillBar) return;

    const skill = this.skillBar.getSkill(slotIndex);
    if (!skill || !skill.enabled) return;

    const action = skill.definition.actions[0];
    if (!action) return;

    const cooldownMs = action.cooldownMs ?? 0;
    const now = Date.now();
    if (cooldownMs > 0 && now - skill.lastUsedTime < cooldownMs) {
      this.notificationPanel?.addEvent('skill', 'Skill on cooldown', 0xff6666);
      return;
    }

    if (action.rangeUnits && action.rangeUnits > 0) {
      this.startTargeting(slotIndex);
    } else {
      this.invokeSkillOnTarget(skill, undefined);
    }
  }

  private startTargeting(slotIndex: number): void {
    this.targetingMode = true;
    this.selectedSkillSlot = slotIndex;
    this.skillBar?.highlightSlot(slotIndex, true);
    this.notificationPanel?.addEvent('skill', 'Select a target...', 0x66aaff);
  }

  private cancelTargeting(): void {
    if (this.selectedSkillSlot !== null && this.skillBar) {
      this.skillBar.highlightSlot(this.selectedSkillSlot, false);
    }
    this.targetingMode = false;
    this.selectedSkillSlot = null;
  }

  private invokeSkillOnTarget(skill: SkillSlot, targetEntityId: string | undefined): void {
    const action = skill.definition.actions[0];
    if (!action) return;

    gameClient.invokeSkill(skill.definition.id, action.id, targetEntityId);
    skill.lastUsedTime = Date.now();

    if (action.castTimeMs && action.castTimeMs > 0) {
      this.castBar?.startCast({
        skillName: skill.definition.name,
        startTime: Date.now(),
        completionTime: Date.now() + action.castTimeMs,
      });
    }
  }

  private findEntityAtPosition(x: number, y: number): string | undefined {
    const clickRadius = 32;
    let closestId: string | undefined;
    let closestDist = Infinity;

    this.entityData.forEach((entity, id) => {
      if (id === gameClient.entityId) return;
      const dist = Phaser.Math.Distance.Between(x, y, entity.pos.x, entity.pos.y);
      if (dist < clickRadius && dist < closestDist) {
        closestDist = dist;
        closestId = id;
      }
    });

    return closestId;
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

  private createZoneNameLabels(): void {
    const ZONE_DISPLAY_NAMES: Record<ZoneId, string> = {
      lobby: 'LOBBY',
      office: 'OFFICE',
      'central-park': 'CENTRAL PARK',
      arcade: 'ARCADE',
      meeting: 'MEETING',
      'lounge-cafe': 'LOUNGE CAFÉ',
      plaza: 'PLAZA',
      lake: 'LAKE',
    };

    for (const [zoneId, bounds] of Object.entries(ZONE_BOUNDS) as [
      ZoneId,
      (typeof ZONE_BOUNDS)[ZoneId],
    ][]) {
      const displayName = ZONE_DISPLAY_NAMES[zoneId];
      const color = ZONE_COLORS[zoneId];

      const label = this.add.text(bounds.x + bounds.width / 2, bounds.y + 20, displayName, {
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
        shadow: {
          offsetX: 1,
          offsetY: 1,
          color: '#000000',
          blur: 2,
          stroke: true,
          fill: true,
        },
      });
      label.setOrigin(0.5, 0);
      label.setDepth(50);
      label.setAlpha(0.85);

      const bgWidth = label.width + 16;
      const bgHeight = label.height + 8;
      const bg = this.add.graphics();
      bg.fillStyle(color, 0.3);
      bg.fillRoundedRect(
        bounds.x + bounds.width / 2 - bgWidth / 2,
        bounds.y + 16,
        bgWidth,
        bgHeight,
        4
      );
      bg.setDepth(49);

      this.zoneNameLabels.push(label);
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
    if (!this.zoneDebug) {
      this.zoneDebug = this.add.graphics();
      this.zoneDebug.setDepth(999);
    }

    this.collisionDebug.clear();
    this.zoneDebug.clear();

    if (this.debugIndicator) this.debugIndicator.destroy();
    if (this.debugLegend) this.debugLegend.destroy();
    if (this.debugInfoPanel) {
      this.debugInfoPanel.destroy();
      this.debugInfoTexts = [];
    }
    this.debugZoneLabels.forEach(label => label.destroy());
    this.debugZoneLabels = [];

    if (!this.debugEnabled || !this.map) return;

    this.drawDebugMapBoundary();
    this.drawDebugZones();
    this.drawDebugCollisionTiles();
    this.drawDebugSpawnPoint();
    this.createDebugLegend();
    this.createDebugInfoPanel();
  }

  private drawDebugMapBoundary(): void {
    if (!this.map || !this.zoneDebug) return;
    const mapWidth = this.map.width * 32;
    const mapHeight = this.map.height * 32;

    this.zoneDebug.lineStyle(3, DEBUG_COLORS.mapBorder, 0.8);
    this.zoneDebug.strokeRect(0, 0, mapWidth, mapHeight);
  }

  private drawDebugZones(): void {
    if (!this.zoneDebug) return;

    const myEntity = gameClient.entityId ? this.entityData.get(gameClient.entityId) : null;
    const currentZone = myEntity?.currentZone ?? null;

    for (const [zoneId, bounds] of Object.entries(ZONE_BOUNDS) as [
      ZoneId,
      (typeof ZONE_BOUNDS)[ZoneId],
    ][]) {
      const color = ZONE_COLORS[zoneId];
      const isCurrentZone = zoneId === currentZone;

      this.zoneDebug.fillStyle(color, isCurrentZone ? 0.35 : 0.15);
      this.zoneDebug.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

      this.zoneDebug.lineStyle(isCurrentZone ? 3 : 2, color, isCurrentZone ? 1 : 0.6);
      this.zoneDebug.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

      if (isCurrentZone) {
        this.zoneDebug.lineStyle(2, DEBUG_COLORS.currentZone, 0.8);
        this.zoneDebug.strokeRect(bounds.x - 2, bounds.y - 2, bounds.width + 4, bounds.height + 4);
      }

      const label = this.add.text(
        bounds.x + bounds.width / 2,
        bounds.y + 12,
        zoneId.toUpperCase(),
        { fontSize: '10px', color: '#ffffff', fontStyle: 'bold' }
      );
      label.setOrigin(0.5, 0);
      label.setDepth(1001);
      label.setAlpha(0.8);
      this.debugZoneLabels.push(label);
    }
  }

  private drawDebugCollisionTiles(): void {
    if (!this.map || !this.collisionDebug) return;

    const collisionLayer = this.map.getLayer('collision');
    if (!collisionLayer) return;

    let blockedCount = 0;
    collisionLayer.data.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile.index > 0) {
          blockedCount++;
          this.collisionDebug?.fillStyle(DEBUG_COLORS.collision, 0.4);
          this.collisionDebug?.fillRect(x * 32, y * 32, 32, 32);
          this.collisionDebug?.lineStyle(1, DEBUG_COLORS.collision, 0.6);
          this.collisionDebug?.strokeRect(x * 32, y * 32, 32, 32);
        }
      });
    });

    this._debugBlockedCount = blockedCount;
  }

  private drawDebugSpawnPoint(): void {
    if (!this.zoneDebug) return;

    const { x: spawnX, y: spawnY } = DEFAULT_SPAWN_POINT;
    const size = 16;

    this.zoneDebug.fillStyle(DEBUG_COLORS.spawn, 0.8);
    this.zoneDebug.fillCircle(spawnX, spawnY, size);
    this.zoneDebug.lineStyle(2, 0x000000, 1);
    this.zoneDebug.strokeCircle(spawnX, spawnY, size);

    this.zoneDebug.lineStyle(3, DEBUG_COLORS.spawn, 1);
    this.zoneDebug.lineBetween(spawnX, spawnY - size - 5, spawnX, spawnY - size + 5);
    this.zoneDebug.lineBetween(spawnX - 5, spawnY - size, spawnX + 5, spawnY - size);
  }

  private createDebugLegend(): void {
    const x = 10;
    const y = 10;
    const lineHeight = 16;
    const boxSize = 12;

    this.debugLegend = this.add.container(x, y);
    this.debugLegend.setScrollFactor(0);
    this.debugLegend.setDepth(2000);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(0, 0, 180, 200, 6);
    this.debugLegend.add(bg);

    const title = this.add.text(8, 6, 'DEBUG MODE (F3)', {
      fontSize: '11px',
      color: '#ffff00',
      fontStyle: 'bold',
    });
    this.debugLegend.add(title);

    const items: Array<{ label: string; color: number; type: 'fill' | 'stroke' }> = [
      { label: 'Collision Tiles', color: DEBUG_COLORS.collision, type: 'fill' },
      { label: 'Map Boundary', color: DEBUG_COLORS.mapBorder, type: 'stroke' },
      { label: 'Spawn Point', color: DEBUG_COLORS.spawn, type: 'fill' },
      { label: 'Current Zone', color: DEBUG_COLORS.currentZone, type: 'stroke' },
    ];

    const zoneItems: Array<{ label: string; color: number }> = [
      { label: 'Lobby', color: ZONE_COLORS.lobby },
      { label: 'Office', color: ZONE_COLORS.office },
      { label: 'Central Park', color: ZONE_COLORS['central-park'] },
      { label: 'Arcade', color: ZONE_COLORS.arcade },
      { label: 'Meeting', color: ZONE_COLORS.meeting },
      { label: 'Lounge Cafe', color: ZONE_COLORS['lounge-cafe'] },
      { label: 'Plaza', color: ZONE_COLORS.plaza },
      { label: 'Lake', color: ZONE_COLORS.lake },
    ];

    let yOffset = 24;

    for (const item of items) {
      const itemGfx = this.add.graphics();
      if (item.type === 'fill') {
        itemGfx.fillStyle(item.color, 0.8);
        itemGfx.fillRect(8, yOffset, boxSize, boxSize);
      } else {
        itemGfx.lineStyle(2, item.color, 1);
        itemGfx.strokeRect(8, yOffset, boxSize, boxSize);
      }
      this.debugLegend.add(itemGfx);

      const itemLabel = this.add.text(26, yOffset, item.label, {
        fontSize: '10px',
        color: '#ffffff',
      });
      this.debugLegend.add(itemLabel);
      yOffset += lineHeight;
    }

    yOffset += 4;
    const zoneSeparator = this.add.text(8, yOffset, '--- Zones ---', {
      fontSize: '9px',
      color: '#888888',
    });
    this.debugLegend.add(zoneSeparator);
    yOffset += 14;

    for (const zone of zoneItems) {
      const zoneGfx = this.add.graphics();
      zoneGfx.fillStyle(zone.color, 0.6);
      zoneGfx.fillRect(8, yOffset, boxSize, boxSize);
      zoneGfx.lineStyle(1, zone.color, 1);
      zoneGfx.strokeRect(8, yOffset, boxSize, boxSize);
      this.debugLegend.add(zoneGfx);

      const zoneLabel = this.add.text(26, yOffset, zone.label, {
        fontSize: '10px',
        color: '#ffffff',
      });
      this.debugLegend.add(zoneLabel);
      yOffset += lineHeight;
    }
  }

  private createDebugInfoPanel(): void {
    const screenWidth = this.cameras.main.width;
    const x = screenWidth - 200;
    const y = 10;

    this.debugInfoPanel = this.add.container(x, y);
    this.debugInfoPanel.setScrollFactor(0);
    this.debugInfoPanel.setDepth(2000);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRoundedRect(0, 0, 190, 100, 6);
    this.debugInfoPanel.add(bg);

    // Create text objects once and store references
    this.debugInfoTexts = [];
    let yOffset = 8;
    for (let i = 0; i < 5; i++) {
      const text = this.add.text(8, yOffset, '', {
        fontSize: '11px',
        color: '#ffffff',
      });
      this.debugInfoPanel.add(text);
      this.debugInfoTexts.push(text);
      yOffset += 16;
    }

    this.refreshDebugInfoText();
  }

  private refreshDebugInfoText(): void {
    if (this.debugInfoTexts.length < 5) return;

    const myEntity = gameClient.entityId ? this.entityData.get(gameClient.entityId) : null;
    const currentZone = myEntity?.currentZone ?? 'none';
    const tile = myEntity?.tile ?? { tx: 0, ty: 0 };
    const pos = myEntity?.pos ?? { x: 0, y: 0 };
    const blockedCount = this._debugBlockedCount;

    const isBlocked = this.clientCollision?.isBlocked(tile.tx, tile.ty) ?? false;

    this.debugInfoTexts[0].setText(`Tile: (${tile.tx}, ${tile.ty})`);
    this.debugInfoTexts[0].setColor('#ffffff');

    this.debugInfoTexts[1].setText(`Position: (${Math.round(pos.x)}, ${Math.round(pos.y)})`);
    this.debugInfoTexts[1].setColor('#ffffff');

    this.debugInfoTexts[2].setText(`Zone: ${currentZone}`);
    this.debugInfoTexts[2].setColor('#ffffff');

    this.debugInfoTexts[3].setText(`Blocked: ${isBlocked ? 'YES' : 'no'}`);
    this.debugInfoTexts[3].setColor(isBlocked ? '#ff6666' : '#ffffff');

    this.debugInfoTexts[4].setText(`Total blocked tiles: ${blockedCount}`);
    this.debugInfoTexts[4].setColor('#ffffff');
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
    this.skillBar?.destroy();
    this.castBar?.destroy();
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

    this.setupSkillEventListeners(room);
  }

  private setupSkillEventListeners(room: NonNullable<typeof gameClient.currentRoom>): void {
    room.onMessage(
      'skill.cast_started',
      (data: { txId: string; skillId: string; casterId: string; completionTime: number }) => {
        if (data.casterId === gameClient.entityId) {
          const skill = this.builtinSkills.find(s => s.id === data.skillId);
          if (skill) {
            this.castBar?.startCast({
              skillName: skill.name,
              startTime: Date.now(),
              completionTime: data.completionTime,
            });
          }
        }
        this.notificationPanel?.addEvent('skill', `Casting ${data.skillId}...`, 0x66aaff);
      }
    );

    room.onMessage(
      'skill.cast_complete',
      (data: { txId: string; skillId: string; casterId: string; targetId?: string }) => {
        if (data.casterId === gameClient.entityId) {
          this.castBar?.cancelCast();
        }
        this.notificationPanel?.addEvent('skill', `${data.skillId} complete!`, 0x66ff66);
      }
    );

    room.onMessage(
      'skill.cast_cancelled',
      (data: { txId: string; skillId: string; casterId: string; reason: string }) => {
        if (data.casterId === gameClient.entityId) {
          this.castBar?.cancelCast();
        }
        this.notificationPanel?.addEvent('skill', `Cast cancelled: ${data.reason}`, 0xffaa66);
      }
    );

    room.onMessage(
      'effect.applied',
      (data: { effectInstanceId: string; effectType: string; targetEntityId: string }) => {
        this.applyEffectVisual(data.targetEntityId, data.effectType);
        this.notificationPanel?.addEvent('effect', `${data.effectType} applied`, 0xaa66ff);
      }
    );

    room.onMessage(
      'effect.expired',
      (data: { effectInstanceId: string; effectType: string; targetEntityId: string }) => {
        this.removeEffectVisual(data.targetEntityId, data.effectType);
      }
    );
  }

  private applyEffectVisual(entityId: string, effectType: string): void {
    const container = this.entities.get(entityId);
    if (!container) return;

    let effects = this.entityEffects.get(entityId);
    if (!effects) {
      effects = new Set();
      this.entityEffects.set(entityId, effects);
    }
    effects.add(effectType);

    const sprite = container.list[0] as Phaser.GameObjects.Sprite;
    if (effectType === 'slowed') {
      sprite.setTint(0x6688ff);
    }
  }

  private removeEffectVisual(entityId: string, effectType: string): void {
    const container = this.entities.get(entityId);
    if (!container) return;

    const effects = this.entityEffects.get(entityId);
    if (effects) {
      effects.delete(effectType);
    }

    const sprite = container.list[0] as Phaser.GameObjects.Sprite;
    const remainingEffects = effects?.size ?? 0;
    if (remainingEffects === 0) {
      if (entityId === gameClient.entityId) {
        sprite.setTint(0xffff00);
      } else {
        sprite.clearTint();
      }
    }
  }

  private updateEntityData(entity: Entity, key: string) {
    this.entityData.set(key, entity);
    this.updateEntityStatus(key, entity);

    if (key === gameClient.entityId) {
      this.checkZoneChange(entity);
    }
  }

  private checkZoneChange(entity: Entity): void {
    const rawZone = entity.currentZone;
    const currentZone: ZoneId | null = rawZone ? (rawZone as ZoneId) : null;

    if (currentZone === this.previousZone) return;

    if (this.previousZone && !currentZone) {
      this.zoneBanner?.showLeave(this.previousZone);
      this.notificationPanel?.addEvent(
        'zone.exit',
        `Left zone: ${this.previousZone}`,
        EVENT_COLORS['zone.exit']
      );
    } else if (this.previousZone && currentZone) {
      this.zoneBanner?.showLeave(this.previousZone);
      this.zoneBanner?.showEnter(currentZone);
      this.notificationPanel?.addEvent(
        'zone.exit',
        `Left zone: ${this.previousZone}`,
        EVENT_COLORS['zone.exit']
      );
      this.notificationPanel?.addEvent(
        'zone.enter',
        `Entered zone: ${currentZone}`,
        EVENT_COLORS['zone.enter']
      );
    } else if (!this.previousZone && currentZone) {
      this.zoneBanner?.showEnter(currentZone);
      this.notificationPanel?.addEvent(
        'zone.enter',
        `Entered zone: ${currentZone}`,
        EVENT_COLORS['zone.enter']
      );
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

    const now = Date.now();
    this.handleKeyboardMovement();
    this.interpolateEntities();
    this.checkNearbyObjects();
    this.notificationPanel?.update(delta);
    this.updateMinimap();
    this.skillBar?.update(now);
    this.castBar?.update(now);
    this.updateDebugInfoPanel();
  }

  private updateDebugInfoPanel(): void {
    if (!this.debugEnabled || !this.debugInfoPanel) return;
    this.refreshDebugInfoText();
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
