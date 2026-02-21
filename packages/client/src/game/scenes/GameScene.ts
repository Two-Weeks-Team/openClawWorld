import Phaser from 'phaser';
import { Callbacks } from '@colyseus/sdk';
import {
  gameClient,
  type Entity,
  type NPC,
  type InteractResult,
} from '../../network/ColyseusClient';
import { EventNotificationPanel, EVENT_COLORS } from '../../ui/EventNotificationPanel';
import { Minimap } from '../../ui/Minimap';
import { ZoneBanner } from '../../ui/ZoneBanner';
import { TileInterpreter } from '../../world/TileInterpreter';
import { ClientCollisionSystem } from '../../systems/CollisionSystem';
import { AudioManager, AudioKeys } from '../../systems/AudioManager';
import { SkillBar, type SkillSlot } from '../../ui/SkillBar';
import { CastBar } from '../../ui/CastBar';
import { skinTintFromId, createHeadSprite, CHARACTER_PACK_KEY } from '../CharacterPack';
import { EmoteDisplay } from '../../ui/EmoteDisplay';
import {
  createWalkAnimations,
  updatePlayerAnimation,
  updateNPCAnimation,
  getNPCSpriteKey,
} from '../AnimationManager';
import type { ZoneId, SkillDefinition } from '@openclawworld/shared';
import {
  ZONE_BOUNDS,
  ZONE_COLORS,
  ZONE_DISPLAY_NAMES,
  DEBUG_COLORS,
  DEFAULT_SPAWN_POINT,
  MAP_LAYERS,
  MAP_TILESETS,
} from '@openclawworld/shared';

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

// Zone label positioning constants (production)
const ZONE_LABEL_OFFSET_Y_FACTOR = 0.08;
const ZONE_LABEL_MIN_OFFSET_Y = 8;
const ZONE_LABEL_MAX_OFFSET_Y = 24;
const ZONE_LABEL_BG_Y_ADJUST = 4;

// Zone label positioning constants (debug)
const DEBUG_LABEL_OFFSET_Y_FACTOR = 0.05;
const DEBUG_LABEL_MIN_OFFSET_Y = 6;
const DEBUG_LABEL_MAX_OFFSET_Y = 16;

const DEFAULT_FACILITY_ACTION_BY_TYPE: Record<string, string> = {
  reception_desk: 'get_info',
  kanban_terminal: 'view_tasks',
  whiteboard: 'view',
  cafe_counter: 'view_menu',
  vending_machine: 'view_items',
  schedule_kiosk: 'view_schedule',
  notice_board: 'read',
  game_table: 'join',
  pond_edge: 'view',
  room_door_a: 'enter',
  room_door_b: 'enter',
  room_door_c: 'enter',
  gate: 'enter',
  fountain: 'view',
  arcade_cabinets: 'play',
  agenda_panel: 'view',
  watercooler: 'chat',
};

export class GameScene extends Phaser.Scene {
  private entities: Map<string, Phaser.GameObjects.Container> = new Map();
  private entityData: Map<string, Entity> = new Map();
  private npcContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private npcData: Map<string, NPC> = new Map();
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
  private zoneNameBackgrounds: Phaser.GameObjects.Graphics[] = [];
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
  private audioManager?: AudioManager;
  private emoteDisplay?: EmoteDisplay;
  private skillKeys?: Phaser.Input.Keyboard.Key[];
  private targetingMode = false;
  private selectedSkillSlot: number | null = null;

  // Input State Machine:
  // Idle -> ChatFocus: Enter key pressed
  // Idle -> Targeting: Skill activation
  // Targeting -> Idle: Target selected or cancelled
  // ChatFocus -> Idle: Chat submitted or ESC
  // Priority: Targeting > ChatFocus > Idle
  private entityEffects: Map<string, Set<string>> = new Map();
  private entityPrevPos: Map<string, { x: number; y: number }> = new Map();
  private npcSpriteKeys: Map<string, string> = new Map();
  private builtinSkills: SkillDefinition[] = [];
  private _debugBlockedCount = 0;
  private debugInfoTexts: Phaser.GameObjects.Text[] = [];
  private cameraFollowTargetId: string | null = null;
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;

  constructor() {
    super('GameScene');
  }

  create() {
    this.createMap();
    this.renderMapObjects();
    this.createZoneNameLabels();
    this.setupViewportHandling();
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
    this.audioManager = new AudioManager(this);
    this.emoteDisplay = new EmoteDisplay(this);

    this.tileInterpreter = new TileInterpreter(16);
    this.clientCollision = new ClientCollisionSystem();
    this.initializeWorldGrid();

    this.setupSkillKeys();
    this.initializeBuiltinSkills();

    this.setupKeyboardFocusHandling();
    this.setupAudioControls();

    createWalkAnimations(this);
  }

  private initializeWorldGrid(): void {
    if (!this.map || !this.tileInterpreter || !this.clientCollision) return;

    const groundLayer = this.map.getLayer(MAP_LAYERS.GROUND);
    const collisionLayer = this.map.getLayer(MAP_LAYERS.COLLISION);

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

      this.clientCollision.setWorldGrid(worldGrid, 16);
      this.minimap?.setWorldGrid(worldGrid, 16);
    }
  }

  private setupViewportHandling(): void {
    this.applyCameraViewportSettings();
    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      this.applyCameraViewportSettings();
      if (this.interactionPrompt) {
        this.interactionPrompt.setPosition(gameSize.width / 2, gameSize.height - 60);
      }
    };
    this.scale.on('resize', this.resizeHandler);
  }

  private applyCameraViewportSettings(): void {
    if (!this.map) return;

    const mapWidth = this.map.widthInPixels;
    const mapHeight = this.map.heightInPixels;
    const camera = this.cameras.main;

    const minZoomToCoverMap = Math.max(camera.width / mapWidth, camera.height / mapHeight, 1);
    camera.setZoom(minZoomToCoverMap);
    camera.setBounds(0, 0, mapWidth, mapHeight);
  }

  private ensureCameraFollowToPlayer(): void {
    const myEntityId = gameClient.entityId;
    if (!myEntityId) return;

    const myContainer = this.entities.get(myEntityId);
    if (!myContainer) return;

    if (this.cameraFollowTargetId === myEntityId) {
      return;
    }

    this.cameras.main.startFollow(myContainer, true, 0.1, 0.1);
    this.cameraFollowTargetId = myEntityId;
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

  private setupAudioControls(): void {
    // M key toggles mute
    this.input.keyboard?.addKey('M').on('down', () => {
      if (this.chatInputFocused) return;
      const muted = this.audioManager?.toggleMute();
      this.notificationPanel?.addEvent('system', muted ? 'Audio muted' : 'Audio unmuted', 0xaaaaaa);
    });

    // Start background music (deferred until user interaction unlocks audio context)
    this.audioManager?.playBgm();
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

  private handleTargetingPointerDown(pointer: Phaser.Input.Pointer): void {
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
    const clickRadius = 16;
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

    const tilesets = MAP_TILESETS
      .map(name => this.map!.addTilesetImage(name, name))
      .filter(Boolean) as Phaser.Tilemaps.Tileset[];

    if (tilesets.length > 0) {
      this.map.createLayer(MAP_LAYERS.GROUND, tilesets, 0, 0);
      const collisionLayer = this.map.createLayer(MAP_LAYERS.COLLISION, tilesets, 0, 0);
      if (collisionLayer) {
        collisionLayer.setAlpha(0);
      }
    }

    this.marker = this.add.graphics();
    this.marker.lineStyle(2, 0xffff00, 1);
    this.marker.strokeRect(0, 0, 16, 16);
    this.marker.setVisible(false);
    this.marker.setDepth(100);
  }

  private createZoneNameLabels(): void {
    for (const [zoneId, bounds] of Object.entries(ZONE_BOUNDS) as [
      ZoneId,
      (typeof ZONE_BOUNDS)[ZoneId],
    ][]) {
      const displayName = ZONE_DISPLAY_NAMES[zoneId];
      const color = ZONE_COLORS[zoneId];

      const labelOffsetY = Math.max(
        ZONE_LABEL_MIN_OFFSET_Y,
        Math.min(ZONE_LABEL_MAX_OFFSET_Y, bounds.height * ZONE_LABEL_OFFSET_Y_FACTOR)
      );
      const label = this.add.text(
        bounds.x + bounds.width / 2,
        bounds.y + labelOffsetY,
        displayName,
        {
          fontSize: '16px',
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
        }
      );
      label.setOrigin(0.5, 0);
      label.setDepth(50);
      label.setAlpha(0.85);

      const bgWidth = label.width + 16;
      const bgHeight = label.height + 8;
      const bg = this.add.graphics();
      bg.fillStyle(color, 0.3);
      bg.fillRoundedRect(
        bounds.x + bounds.width / 2 - bgWidth / 2,
        bounds.y + labelOffsetY - ZONE_LABEL_BG_Y_ADJUST,
        bgWidth,
        bgHeight,
        4
      );
      bg.setDepth(49);

      this.zoneNameLabels.push(label);
      this.zoneNameBackgrounds.push(bg);
    }
  }

  private renderMapObjects() {
    if (!this.map) return;

    const objectLayer = this.map.getObjectLayer(MAP_LAYERS.OBJECTS);
    if (!objectLayer) return;

    const objects = (objectLayer as unknown as TiledObjectLayer).objects;
    if (!objects) return;

    for (const obj of objects) {
      const interactionType = this.getObjectProperty(obj, 'type');
      if (interactionType === 'spawn' || obj.type === 'building_entrance') {
        continue;
      }

      // Facility objects are interaction metadata. Their visuals come from tiles/layers.
      if (interactionType === 'facility') {
        this.mapObjectData.set(obj.name, obj);
        continue;
      }

      const objType = (typeof interactionType === 'string' ? interactionType : obj.type) ?? '';
      if (!objType) continue;

      let atlasKey: 'objects' | 'players' = 'objects';
      let frameKey = '';

      switch (objType) {
        case 'chest':
          frameKey = 'chest';
          break;
        case 'sign':
          frameKey = 'sign';
          break;
        case 'portal':
          frameKey = 'portal';
          break;
        case 'npc': {
          const npcId = this.getObjectProperty(obj, 'npcId') as string;
          if (npcId) {
            const npcSprite = this.add.sprite(
              obj.x + obj.width / 2,
              obj.y + obj.height / 2,
              'npcs',
              npcId
            );
            npcSprite.setDepth(obj.y);
            this.mapObjects.set(obj.name, npcSprite);
            this.mapObjectData.set(obj.name, obj);
            continue;
          }
          atlasKey = 'players';
          frameKey = 'player-object';
          break;
        }
        case 'decoration':
          if (obj.name.includes('fountain')) frameKey = 'fountain';
          else if (obj.name.includes('lamp')) frameKey = 'lamp';
          else if (obj.name.includes('bench')) frameKey = 'bench';
          break;
        default:
          continue;
      }

      if (!frameKey) continue;

      const sprite = this.add.sprite(
        obj.x + obj.width / 2,
        obj.y + obj.height / 2,
        atlasKey,
        frameKey
      );
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
    if (!obj.properties) return null;
    const prop = obj.properties.find(p => p.name === propName);
    return prop ? prop.value : null;
  }

  private setupInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.targetingMode) {
        this.handleTargetingPointerDown(pointer);
        return;
      }
      if (!this.map) return;

      const worldPoint = pointer.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const pointerTileX = this.map.worldToTileX(worldPoint.x);
      const pointerTileY = this.map.worldToTileY(worldPoint.y);

      if (pointerTileX !== null && pointerTileY !== null) {
        this.marker?.setPosition(pointerTileX * 16, pointerTileY * 16);
        this.marker?.setVisible(true);

        this.audioManager?.playSfx(AudioKeys.CLICK, 0.4);
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
        this.audioManager?.playSfx(AudioKeys.CONFIRM, 0.6);
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
    const serverInteraction = this.resolveFacilityInteraction(obj);
    if (serverInteraction) {
      gameClient.interact(serverInteraction.targetId, serverInteraction.action);
      return;
    }

    const interactionType = this.getObjectProperty(obj, 'type');
    const objType = (typeof interactionType === 'string' ? interactionType : obj.type) ?? '';

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
            sprite.setTexture('objects', 'chest-open');
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

  private resolveFacilityInteraction(obj: MapObject): { targetId: string; action: string } | null {
    // Tiled custom property `type` is the interaction category (e.g. `facility`),
    // while `obj.type` is the concrete facility subtype (e.g. `notice_board`).
    const interactionType = this.getObjectProperty(obj, 'type');
    if (interactionType !== 'facility') {
      return null;
    }

    const zone = this.getObjectProperty(obj, 'zone');
    if (typeof zone !== 'string' || zone.length === 0) {
      return null;
    }

    const action = DEFAULT_FACILITY_ACTION_BY_TYPE[obj.type];
    if (!action) {
      return null;
    }

    return {
      targetId: `${zone}-${obj.name}`,
      action,
    };
  }

  private handleServerInteractionResult(result: InteractResult): void {
    const { outcome } = result;
    if (outcome.message) {
      this.showMessage(outcome.message);
      return;
    }

    if (outcome.type === 'too_far') {
      this.showMessage('Too far away to interact.');
      return;
    }

    if (outcome.type === 'no_effect') {
      this.showMessage('No effect.');
      return;
    }

    if (outcome.type === 'invalid_action') {
      this.showMessage('Interaction is not available.');
      return;
    }

    if (outcome.type === 'ok') {
      this.showMessage('Interaction complete.');
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
    const mapWidth = this.map.width * 16;
    const mapHeight = this.map.height * 16;

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

      const debugLabelOffsetY = Math.max(
        DEBUG_LABEL_MIN_OFFSET_Y,
        Math.min(DEBUG_LABEL_MAX_OFFSET_Y, bounds.height * DEBUG_LABEL_OFFSET_Y_FACTOR)
      );
      const label = this.add.text(
        bounds.x + bounds.width / 2,
        bounds.y + debugLabelOffsetY,
        zoneId.toUpperCase(),
        { fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }
      );
      label.setOrigin(0.5, 0);
      label.setDepth(1001);
      label.setAlpha(0.8);
      this.debugZoneLabels.push(label);
    }
  }

  private drawDebugCollisionTiles(): void {
    if (!this.map || !this.collisionDebug) return;

    const collisionLayer = this.map.getLayer(MAP_LAYERS.COLLISION);
    if (!collisionLayer) return;

    let blockedCount = 0;
    collisionLayer.data.forEach((row, y) => {
      row.forEach((tile, x) => {
        if (tile.index > 0) {
          blockedCount++;
          this.collisionDebug?.fillStyle(DEBUG_COLORS.collision, 0.4);
          this.collisionDebug?.fillRect(x * 16, y * 16, 16, 16);
          this.collisionDebug?.lineStyle(1, DEBUG_COLORS.collision, 0.6);
          this.collisionDebug?.strokeRect(x * 16, y * 16, 16, 16);
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
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }
    this.cameras.main.stopFollow();
    this.cameraFollowTargetId = null;
    this.zoneNameLabels.forEach(label => label.destroy());
    this.zoneNameLabels = [];
    this.zoneNameBackgrounds.forEach(bg => bg.destroy());
    this.zoneNameBackgrounds = [];
    this.npcContainers.forEach(container => container.destroy());
    this.npcContainers.clear();
    this.npcData.clear();
    this.notificationPanel?.destroy();
    this.minimap?.destroy();
    this.zoneBanner?.destroy();
    this.skillBar?.destroy();
    this.castBar?.destroy();
    this.audioManager?.destroy();
    this.emoteDisplay?.destroy();
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

    callbacks.onAdd('npcs', (npc, key) => {
      this.addNPC(npc, key);
      callbacks.onChange(npc, () => this.updateNPCData(npc, key));
    });
    callbacks.onRemove('npcs', (_npc, key) => this.removeNPC(key));

    room.onMessage('chat', (data: { from: string; message: string; entityId: string }) => {
      this.showChatBubble(data.entityId, data.message);
      this.notificationPanel?.addEvent('chat', `${data.from}: ${data.message}`, EVENT_COLORS.chat);
    });

    room.onMessage('emote', (data: { entityId: string; emoteType: string }) => {
      const entityContainer = this.entities.get(data.entityId);
      if (entityContainer && this.emoteDisplay) {
        this.emoteDisplay.showEmote(data.entityId, entityContainer, data.emoteType);
      }
    });

    room.onMessage('interact.result', (result: InteractResult) => {
      this.handleServerInteractionResult(result);
    });

    room.onMessage('assignedEntityId', () => {
      this.ensureCameraFollowToPlayer();
    });

    this.ensureCameraFollowToPlayer();

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

        // Sparkle effect at the caster position on successful cast
        const casterContainer = this.entities.get(data.casterId);
        if (casterContainer) {
          this.showEffect(casterContainer.x, casterContainer.y, 'sparkle');
        }
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

    // Play a particle burst when an effect is applied
    this.showEffect(container.x, container.y, 'skill_hit');
  }

  /**
   * Play a one-shot particle effect at a world position.
   *
   * Available presets:
   * - `sparkle`: golden star particles (interactions, pickups)
   * - `poof`: smoke puff particles (disappearance, spawn)
   * - `skill_hit`: blue spark burst (skill impact, effect application)
   */
  showEffect(x: number, y: number, type: 'sparkle' | 'poof' | 'skill_hit'): void {
    let textureKey: string;
    let tint: number | undefined;
    let speed: { min: number; max: number };
    let scaleStart: number;
    let lifespan: number;
    let quantity: number;

    switch (type) {
      case 'sparkle':
        textureKey = 'particle-star';
        tint = 0xffee88;
        speed = { min: 15, max: 60 };
        scaleStart = 0.08;
        lifespan = 700;
        quantity = 5;
        break;
      case 'poof':
        textureKey = 'particle-smoke';
        tint = 0xcccccc;
        speed = { min: 10, max: 40 };
        scaleStart = 0.1;
        lifespan = 600;
        quantity = 4;
        break;
      case 'skill_hit':
        textureKey = 'particle-spark';
        tint = 0x66aaff;
        speed = { min: 30, max: 100 };
        scaleStart = 0.06;
        lifespan = 500;
        quantity = 8;
        break;
    }

    const emitter = this.add.particles(x, y, textureKey, {
      speed,
      scale: { start: scaleStart, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan,
      quantity,
      tint,
      emitting: false,
    });
    emitter.setDepth(y + 1);
    emitter.explode();

    this.time.delayedCall(lifespan + 100, () => emitter.destroy());
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
      this.ensureCameraFollowToPlayer();
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
      this.audioManager?.playSfx(AudioKeys.BONG);
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
    if (type === 'object') {
      // Server-side objects (facilities, etc.) are authoritative interaction targets.
      // Their visuals are rendered from tile/object layers, so avoid duplicate markers.
      this.entityData.set(key, entity);
      return;
    }

    const container = this.add.container(entity.pos.x, entity.pos.y);
    container.setDepth(entity.pos.y);

    // Use the modular character pack for avatar variety: each entity gets a
    // deterministic skin tint derived from its ID, falling back to the legacy
    // players atlas when the character_pack texture is unavailable.
    let sprite: Phaser.GameObjects.Sprite;
    if (this.textures.exists(CHARACTER_PACK_KEY)) {
      const tint = skinTintFromId(key);
      sprite = createHeadSprite(this, tint);
    } else {
      let frame = 'player-human';
      if (type === 'agent') frame = 'player-agent';
      sprite = this.add.sprite(0, 0, 'players', frame);
      sprite.setOrigin(0.5, 0.5);
    }

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
      this.ensureCameraFollowToPlayer();
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
      // Play a poof effect at the entity's last position before destroying
      this.showEffect(entity.x, entity.y, 'poof');
      entity.destroy();
      this.entities.delete(key);
      if (key === this.cameraFollowTargetId) {
        this.cameras.main.stopFollow();
        this.cameraFollowTargetId = null;
      }
    }
    this.entityData.delete(key);
    this.entityPrevPos.delete(key);
  }

  private addNPC(npc: NPC, key: string) {
    const container = this.add.container(npc.x, npc.y);
    container.setDepth(npc.y);

    const spriteKey = getNPCSpriteKey(npc.definitionId || '', npc.role);
    this.npcSpriteKeys.set(key, spriteKey);

    let sprite: Phaser.GameObjects.Sprite;
    if (this.textures.getFrame('npcs', spriteKey)) {
      sprite = this.add.sprite(0, 0, 'npcs', spriteKey);
      sprite.setOrigin(0.5, 0.5);
    } else if (this.textures.exists(CHARACTER_PACK_KEY)) {
      // NPC avatars fall back to the character pack with a deterministic tint
      // from the NPC's definition ID.
      const tint = skinTintFromId(npc.definitionId || key);
      sprite = createHeadSprite(this, tint);
    } else {
      sprite = this.add.sprite(0, 0, 'players', 'player-human');
      sprite.setOrigin(0.5, 0.5);
      sprite.setTint(0x66dd66);
    }

    const nameTag = this.add.text(0, -24, npc.name, {
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#228822aa',
      padding: { x: 4, y: 2 },
    });
    nameTag.setOrigin(0.5, 0.5);

    const roleTag = this.add.text(0, -38, `[${npc.role}]`, {
      fontSize: '9px',
      color: '#aaffaa',
    });
    roleTag.setOrigin(0.5, 0.5);

    container.add([sprite, nameTag, roleTag]);
    this.npcContainers.set(key, container);
    this.npcData.set(key, npc);
  }

  private removeNPC(key: string) {
    const container = this.npcContainers.get(key);
    if (container) {
      container.destroy();
      this.npcContainers.delete(key);
    }
    this.npcData.delete(key);
    this.npcSpriteKeys.delete(key);
  }

  private updateNPCData(npc: NPC, key: string) {
    this.npcData.set(key, npc);
  }

  private interpolateNPCs() {
    this.npcData.forEach((npc, key) => {
      const container = this.npcContainers.get(key);
      if (container) {
        const prevX = container.x;
        const prevY = container.y;
        const t = 0.15;
        container.x = Phaser.Math.Linear(container.x, npc.x, t);
        container.y = Phaser.Math.Linear(container.y, npc.y, t);
        container.setDepth(container.y);

        const sprite = container.list[0] as Phaser.GameObjects.Sprite;
        const dx = Math.abs(container.x - prevX);
        const dy = Math.abs(container.y - prevY);
        const isMoving = dx > 0.1 || dy > 0.1;
        const spriteKey = this.npcSpriteKeys.get(key) ?? 'greeter';
        updateNPCAnimation(sprite, isMoving, npc.facing, spriteKey);
      }
    });
  }

  private handleKeyboardMovement() {
    if (!this.cursors || !this.wasdKeys) return;
    // Priority: Targeting > ChatFocus > Idle (see Input State Machine comments at top)
    if (this.targetingMode) return;
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
        this.audioManager?.playFootstep();
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
      const interactionType = this.getObjectProperty(obj, 'type');
      const objType = (typeof interactionType === 'string' ? interactionType : obj.type) ?? '';
      if (!objType || objType === 'spawn' || objType === 'decoration') return;
      if (obj.type === 'building_entrance') return;

      const objCenterX = obj.x + obj.width / 2;
      const objCenterY = obj.y + obj.height / 2;
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
    this.interpolateNPCs();
    this.checkNearbyObjects();
    this.notificationPanel?.update(delta);
    this.updateMinimap();
    this.skillBar?.update(now);
    this.castBar?.update(now);
    this.updateDebugInfoPanel();
    this.ensureCameraFollowToPlayer();
  }

  private updateDebugInfoPanel(): void {
    if (!this.debugEnabled || !this.debugInfoPanel) return;
    this.refreshDebugInfoText();
  }

  private updateMinimap(): void {
    if (!this.minimap) return;

    const entities = new Map<string, { x: number; y: number; kind: string }>();
    this.entityData.forEach((entity, id) => {
      if (entity.kind !== 'human' && entity.kind !== 'agent') return;
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

        const prev = this.entityPrevPos.get(key);
        const isMoving =
          prev !== undefined &&
          (Math.abs(entity.pos.x - prev.x) > 0.1 || Math.abs(entity.pos.y - prev.y) > 0.1);
        this.entityPrevPos.set(key, { x: entity.pos.x, y: entity.pos.y });

        const entityType = entity.kind === 'agent' ? 'agent' : 'human';
        updatePlayerAnimation(sprite, isMoving, entity.facing, entityType);

        if (key === gameClient.entityId) {
          sprite.setTint(0xffff00);
        }
      }
    });
  }
}
