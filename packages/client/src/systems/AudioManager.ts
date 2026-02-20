import Phaser from 'phaser';

/**
 * Audio key identifiers used throughout the game.
 * Each key maps to a preloaded audio asset.
 */
export const AudioKeys = {
  // UI sounds (Interface Sounds pack)
  CLICK: 'sfx_click',
  CLICK_ALT: 'sfx_click_alt',
  BACK: 'sfx_back',
  BONG: 'sfx_bong',
  CONFIRM: 'sfx_confirm',
  ERROR: 'sfx_error',

  // RPG sounds
  FOOTSTEP_0: 'sfx_footstep_0',
  FOOTSTEP_1: 'sfx_footstep_1',
  FOOTSTEP_2: 'sfx_footstep_2',
  FOOTSTEP_3: 'sfx_footstep_3',
  DOOR_OPEN: 'sfx_door_open',
  DOOR_CLOSE: 'sfx_door_close',
  COINS: 'sfx_coins',
  BOOK_OPEN: 'sfx_book_open',

  // Background music
  BGM_OVERWORLD: 'bgm_overworld',
} as const;

export type AudioKey = (typeof AudioKeys)[keyof typeof AudioKeys];

/**
 * Audio asset manifest used by BootScene to preload all audio files.
 * Each entry maps an AudioKey to its file path under `assets/audio/`.
 */
export const AUDIO_MANIFEST: Array<{ key: AudioKey; path: string }> = [
  // UI
  { key: AudioKeys.CLICK, path: 'assets/audio/click_001.ogg' },
  { key: AudioKeys.CLICK_ALT, path: 'assets/audio/click_002.ogg' },
  { key: AudioKeys.BACK, path: 'assets/audio/back_001.ogg' },
  { key: AudioKeys.BONG, path: 'assets/audio/bong_001.ogg' },
  { key: AudioKeys.CONFIRM, path: 'assets/audio/confirmation_001.ogg' },
  { key: AudioKeys.ERROR, path: 'assets/audio/error_001.ogg' },

  // RPG
  { key: AudioKeys.FOOTSTEP_0, path: 'assets/audio/footstep00.ogg' },
  { key: AudioKeys.FOOTSTEP_1, path: 'assets/audio/footstep01.ogg' },
  { key: AudioKeys.FOOTSTEP_2, path: 'assets/audio/footstep02.ogg' },
  { key: AudioKeys.FOOTSTEP_3, path: 'assets/audio/footstep03.ogg' },
  { key: AudioKeys.DOOR_OPEN, path: 'assets/audio/doorOpen_1.ogg' },
  { key: AudioKeys.DOOR_CLOSE, path: 'assets/audio/doorClose_1.ogg' },
  { key: AudioKeys.COINS, path: 'assets/audio/handleCoins.ogg' },
  { key: AudioKeys.BOOK_OPEN, path: 'assets/audio/bookOpen.ogg' },

  // BGM
  { key: AudioKeys.BGM_OVERWORLD, path: 'assets/audio/bgm_farm_frolics.ogg' },
];

const FOOTSTEP_KEYS: AudioKey[] = [
  AudioKeys.FOOTSTEP_0,
  AudioKeys.FOOTSTEP_1,
  AudioKeys.FOOTSTEP_2,
  AudioKeys.FOOTSTEP_3,
];

/**
 * Centralized audio manager for the game client.
 *
 * Handles SFX playback, background music looping, volume control,
 * and mute toggling. Designed as a lightweight singleton-per-scene
 * that is created by GameScene and referenced where needed.
 *
 * All sounds are preloaded in BootScene via the AUDIO_MANIFEST.
 */
export class AudioManager {
  private scene: Phaser.Scene;
  private bgm: Phaser.Sound.BaseSound | null = null;

  private sfxVolume = 0.5;
  private bgmVolume = 0.3;
  private muted = false;

  private lastFootstepIndex = -1;
  private lastFootstepTime = 0;
  private footstepCooldownMs = 300;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ─── SFX ───────────────────────────────────────────────

  /**
   * Play a one-shot sound effect.
   * Returns early if the game audio context is locked or muted.
   */
  playSfx(key: AudioKey, volumeScale = 1.0): void {
    if (this.muted) return;
    if (this.scene.sound.locked) return;

    this.scene.sound.play(key, {
      volume: this.sfxVolume * volumeScale,
    });
  }

  /**
   * Play a random footstep sound, avoiding consecutive duplicates.
   * Respects a cooldown to prevent overlapping rapid-fire playback.
   */
  playFootstep(): void {
    const now = Date.now();
    if (now - this.lastFootstepTime < this.footstepCooldownMs) return;

    let index: number;
    do {
      index = Math.floor(Math.random() * FOOTSTEP_KEYS.length);
    } while (index === this.lastFootstepIndex && FOOTSTEP_KEYS.length > 1);

    this.lastFootstepIndex = index;
    this.lastFootstepTime = now;
    this.playSfx(FOOTSTEP_KEYS[index], 0.6);
  }

  // ─── BGM ───────────────────────────────────────────────

  /**
   * Start looping background music. If music is already playing,
   * this is a no-op. Call `stopBgm()` first to switch tracks.
   */
  playBgm(key: AudioKey = AudioKeys.BGM_OVERWORLD): void {
    if (this.bgm) return;
    if (this.scene.sound.locked) {
      // Defer until user interaction unlocks the audio context
      this.scene.sound.once('unlocked', () => this.playBgm(key));
      return;
    }

    this.bgm = this.scene.sound.add(key, {
      volume: this.muted ? 0 : this.bgmVolume,
      loop: true,
    });
    this.bgm.play();
  }

  /** Stop and release the current background music track. */
  stopBgm(): void {
    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }
  }

  // ─── Volume & Mute ────────────────────────────────────

  /** Toggle mute state. Returns the new muted value. */
  toggleMute(): boolean {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setSfxVolume(vol: number): void {
    this.sfxVolume = Phaser.Math.Clamp(vol, 0, 1);
  }

  setBgmVolume(vol: number): void {
    this.bgmVolume = Phaser.Math.Clamp(vol, 0, 1);
    if (this.bgm && 'setVolume' in this.bgm) {
      (this.bgm as Phaser.Sound.WebAudioSound).setVolume(this.muted ? 0 : this.bgmVolume);
    }
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getBgmVolume(): number {
    return this.bgmVolume;
  }

  // ─── Lifecycle ─────────────────────────────────────────

  /** Clean up resources. Call from the scene's shutdown handler. */
  destroy(): void {
    this.stopBgm();
  }
}
