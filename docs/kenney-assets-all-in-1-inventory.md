# Kenney Game Assets All-in-1 3.3.0 - Complete Inventory

**Generated:** 2026-02-19
**Source:** `docs/reference/Kenney Game Assets All-in-1 3.3.0/`
**License:** CC0 (Public Domain)

---

## Overview

| Category | Pack Count | Description |
|----------|-----------|-------------|
| **2D assets** | 151 | Tilesets, spritesheets, pixel art |
| **3D assets** | 53 | 3D models and kits |
| **Audio** | 17 | Sound effects and music |
| **UI assets** | 10 | UI components and buttons |
| **Icons** | 8 | Game icons and input prompts |
| **Other** | 4 | Fonts, samples, guides |
| **Archive** | 18 | Legacy/deprecated packs |
| **Goodies** | 5 | Wallpapers, certificates |
| **Total** | **266** | |

---

## 1. openClawWorld Active Packs (Currently Used)

These packs are extracted and integrated into the project via `tools/kenney-curation.json`.

| Pack | Path in Reference | Extracted To | Tile Count | Format |
|------|-------------------|-------------|------------|--------|
| **Roguelike City Pack** | `2D assets/Roguelike City Pack/` | `kenney/tiles/city_tilemap.png` | 1,036 | Tilemap PNG + individual tiles |
| **Roguelike Interior Pack** | `2D assets/Roguelike Interior Pack/` | `kenney/interior/interior_tilemap.png` | ~300 | Tilesheet PNG |
| **Roguelike Characters Pack** | `2D assets/Roguelike Characters Pack/` | `kenney/characters/characters_spritesheet.png` | ~100 | Spritesheet PNG |
| **RPG Urban Pack** | `2D assets/RPG Urban Pack/` | `kenney/urban/urban_tilemap.png` | 486+95 | Tilemap PNG + individual tiles |
| **Tiny Town** | `2D assets/Tiny Town/` | `kenney/tiles/tinytown_tilemap.png` | 132 | Tilemap PNG + individual tiles |

### Source File Mapping

| Extracted File | Original Source File |
|----------------|---------------------|
| `city_tilemap.png` | `Roguelike City Pack/Tilemap/tilemap_packed.png` |
| `city_tilemap_spacing.png` | `Roguelike City Pack/Tilemap/tilemap.png` |
| `interior_tilemap.png` | `Roguelike Interior Pack/Tilesheets/roguelikeIndoor_transparent.png` |
| `characters_spritesheet.png` | `Roguelike Characters Pack/Spritesheet/roguelikeChar_transparent.png` |
| `urban_tilemap.png` | `RPG Urban Pack/Tilemap/tilemap_packed.png` |
| `tinytown_tilemap.png` | `Tiny Town/Tilemap/tilemap_packed.png` |

---

## 2. High-Relevance Packs (Expansion Candidates)

### 2A. Roguelike Family

| Pack | Tiles | Key Files | Potential Use |
|------|-------|-----------|---------------|
| **Roguelike Base Pack** | - | `roguelikeSheet_transparent.png` + 2 TMX maps | Dungeon/interior 확장 |
| **Roguelike Dungeon Pack** | - | `roguelikeDungeon_transparent.png` | 지하 던전 존 추가 |

### 2B. Tiny Family

| Pack | Tiles | Key Files | Potential Use |
|------|-------|-----------|---------------|
| **Tiny Dungeon** | 132 | `tilemap_packed.png` + TMX/TSX | 미니 던전 이벤트 |
| **Tiny Battle** | 198 | `tilemap_packed.png` + TMX/TSX | 전투 시스템 |

### 2C. Pixel / Top-Down

| Pack | Tiles | Key Files | Potential Use |
|------|-------|-----------|---------------|
| **Micro Roguelike** | - | colored + monochrome tilemaps | 미니맵/축소 표현 |
| **Pico-8 City** | 360 | `tilemap_packed.png` + TMX/TSX | 대안 도시 타일 |
| **Pixel Platformer** | 182 | 6 tilemap PNGs + TMX/TSX | 미니게임 |
| **Topdown Shooter (Pixel)** | - | `tilesheet_transparent.png` | 액션 미니게임 |
| **1-Bit Pack** | - | 8 tilesheet variants + 4 TMX maps | 레트로 모드/이벤트 |

### 2D. Strategy / RPG

| Pack | Tiles | Key Files | Potential Use |
|------|-------|-----------|---------------|
| **Monochrome RPG Tileset** | - | 3 color variants | 대안 스타일링 |
| **RTS Medieval (Pixel)** | 212 | `tilemap_packed.png` | 중세 테마 존 |
| **Sokoban Pack** | - | Spritesheet + XML atlas | 퍼즐 미니게임 |

### 2E. UI / HUD

| Pack | Key Files | Potential Use |
|------|-----------|---------------|
| **UI Adventure Pack** | `uipack_rpg_sheet.png` + XML (92 PNGs) | RPG 스타일 UI |
| **UI Pack** | 5 color-themed sheets + XML | 범용 UI 요소 |
| **UI Pack - Pixel Adventure** | Tilesheets (thick/thin outline) | 픽셀 스타일 UI |
| **UI Pixel Pack** | `UIpackSheet_transparent.png` | 미니멀 픽셀 UI |

### 2F. Items / Objects

| Pack | Key Files | Potential Use |
|------|-----------|---------------|
| **Generic Items** | Spritesheet + XML (colored/white) | 인벤토리 아이템 |
| **Monster Builder Pack** | Spritesheet + XML (1x/2x) | NPC 몬스터 |

---

## 3. Low-Relevance Packs (Reference Only)

### 3A. Isometric (현재 프로젝트는 Top-Down 2D)

```
Isometric Blocks              Isometric Medieval Town (268 PNGs)
Isometric Miniature Bases     Isometric Miniature Dungeon (ZIP 14MB)
Isometric Miniature Farm (ZIP 10MB)
Isometric Miniature Library   Isometric Miniature Overworld (ZIP 5MB)
Isometric Miniature Prototype Isometric Minigolf
Isometric Modular Buildings   Isometric Modular Roads
Isometric Nature              Isometric Space Interior
Isometric Tiles Base          Isometric Tiles Buildings
Isometric Tiles City (128 PNGs + XML atlas)
Isometric Tiles Vehicles      Isometric Tower Defense
Isometric Vector Buildings    Isometric Vector Roads Base
Isometric Vector Roads Water  Isometric Watercraft
```

> **Note:** `Isometric Space Interior`는 `kenney-asset-analysis.md`에서 SF 오피스 장비(모니터, 서버랙 등)용으로 권장되었으나, 현재는 커스텀 스프라이트로 대체 완료.

### 3B. Platformer (사이드뷰 - 미사용)

```
Abstract Platformer            Jumper Pack
New Platformer Pack            Pixel Line Platformer
Pixel Platformer Blocks        Pixel Platformer Farm Expansion
Pixel Platformer Food Expansion
Pixel Platformer Industrial Expansion
Platformer Assets Base/Buildings/Candy/Holiday/Ice/Mushroom/Pixel
Platformer Assets Extra Animations & Enemies
Platformer Assets Requests/Tile Extensions
Platformer Bricks              Platformer Characters 1
Platformer Pack Industrial/Medieval/Nautical/Redux
Simplified Platformer Pack     1-Bit Platformer Pack
Pico-8 Platformer
```

### 3C. Vehicles / Racing

```
Pixel Vehicle Pack    Racing Pack
Topdown Tanks         Topdown Tanks Redux
Tappy Plane
```

### 3D. Space / Sci-Fi

```
Simple Space              Space Shooter Extension
Space Shooter Redux       Pixel Shmup
Planets
```

### 3E. Card / Board / Puzzle

```
Playing Cards Pack    Boardgame Pack
Puzzle Assets         Puzzle Assets 2
Letter Tiles          Letter Tiles Redux
```

### 3F. Nature / Misc 2D

```
Animal Pack           Animal Pack Redux
Fish Pack             Foliage Pack
Foliage Sprites       Donuts
Smilies               Emote Pack
Explosion Pack        Smoke Particles
Splat Pack            Yellow Paint Pack
```

### 3G. Hexagon / Map

```
Hexagon Base Pack     Hexagon Buildings Pack
Hexagon Pack          Map Pack
Cartography Pack      Minimap Pack
```

### 3H. Character / Builder

```
Character Pack               Character Pack Facial Hair
Toon Characters Pack 1       Shape Characters
Robot Pack                   Googly Eyes
```

### 3I. Sketch / Drawn Style

```
Sketch Town (348 tiles + TMX)
Sketch Town Expansion (241 tiles + TMX)
Scribble Dungeons (Tilesheet + Vector + TMX)
Scribble Platformer
```

### 3J. Other 2D

```
Crosshair Pack        Medals
Block Pack            Block Pack (Pixel)
Brick Pack            Ranks Pack
Road Textures         Road Textures (Classic)
Pattern Pack          Pattern Pack 2
Pattern Pack Pixel    Physics Assets
Axonometric Blocks    Prototype Textures
Sports Pack           Tank Pack
Tower Defense         Desert Shooter Pack
Shooting Gallery      Holiday Pack 2016
Rolling Ball Assets   Voxel Pack
Voxel Expansion Pack  Rune Pack
Topdown Shooter       RTS Medieval
RTS Sci-fi            Monochrome Pirates
```

---

## 4. Non-2D Assets

### 4A. 3D Assets (53 packs)

현재 프로젝트에서 미사용. 향후 3D 전환 시 참고.

```
Animated Characters 1/2/3/Bundle    Blaster Kit
Blocky Characters    Brick Kit       Building Kit
Car Kit              Castle Kit      City Kit (Commercial/Industrial/Roads/Suburban)
Coaster Kit          Conveyor Kit    Fantasy Town Kit
Food Kit             Furniture Kit   Graveyard Kit
Hexagon Kit          Holiday Kit     Marble Kit
Mini Arcade/Arena/Characters 1/Dungeon/Market/Skate
Minigolf Kit         Modular Buildings/Dungeon Kit
Nature Kit/Classic   Pirate Kit      Platformer Kit
Prototype Kit        Racing Kit      Retro Medieval/Urban Kit
Road Pack            Space Kit/Station Kit
Survival Kit         Tower Defense Classic/Kit
Toy Car Kit          Train Kit       Watercraft Pack
Weapon Pack
```

### 4B. Audio (17 packs)

```
Casino Audio         Digital Audio       Foley Sounds
Impact Sounds        Interface Sounds    Music Jingles
Music Loops          Retro Sounds 1/2    RPG Audio
Sci-Fi Sounds        Synth Voice 1/2     UI Audio
Voiceover Pack       Voiceover Pack Fighter
```

> **Potential Use:** `RPG Audio`, `Interface Sounds`, `UI Audio` - 사운드 시스템 도입 시 활용 가능

### 4C. Icons (8 packs)

```
1-Bit Input Prompts Pixel 16x    Board Game Icons
Board Game Info                  Game Icons
Game Icons Expansion             Game Icons Fighter Expansion
Input Prompts (comprehensive - all platforms)
Input Prompts Pixel 16x
```

> **Potential Use:** `Input Prompts Pixel 16x` - 키보드/마우스 안내 UI

### 4D. UI Assets (10 packs)

```
Cursor Pack              Cursor Pixel Pack
Fantasy UI Borders       Mobile Controls
UI Adventure Pack        UI Pack
UI Pack - Adventure      UI Pack - Pixel Adventure
UI Pack - Sci-fi         UI Pixel Pack
```

### 4E. Other

```
Construct samples 1/2    Fonts/    Miniguides/
```

### 4F. Archive (18 legacy packs)

```
Isometric Overworld Pack    Isometric Renders
Isometric Road Assets       Medieval Town
Mini Car Kit                Minigolf Pack
Nature Pack                 Onscreen Controls
Platformer Assets Pixel     Pre-rendered Models
Roguelike Pack (15x)        Space Kit (Legacy)
Space Shooter Assets        Tower Defense Assets
Road Pack
```

> **Note:** `Roguelike Pack (15x)`는 15x15 픽셀 구버전. 현재 프로젝트는 16x16 기반.

---

## 5. File Format Reference

### Atlas/Data Formats in Kenney Packs

| Format | Extension | Usage | Notes |
|--------|-----------|-------|-------|
| **XML Atlas** | `.xml` | Spritesheet metadata | Kenney 표준 포맷 |
| **Tiled Map** | `.tmx` | 맵 데이터 | Tiled Map Editor 호환 |
| **Tiled Tileset** | `.tsx` | 타일셋 정의 | Tiled Map Editor 호환 |
| **PNG** | `.png` | 이미지 | 모든 팩 공통 |
| **SVG** | `.svg` | 벡터 | 일부 팩만 제공 |
| **SWF** | `.swf` | Flash 벡터 | 레거시, 미사용 권장 |
| **TXT** | `.txt` | 타일시트 정보 | 좌표/크기 설명 |

### Image Naming Conventions

| Pattern | Meaning |
|---------|---------|
| `tilemap_packed.png` | 간격 없는 타일맵 |
| `tilemap.png` | 간격 있는 타일맵 |
| `*_transparent.png` | 투명 배경 |
| `*_magenta.png` | 마젠타 배경 (크로마키) |
| `*@2.png` / `*_2X.png` | 2배 해상도 |
| `tile_XXXX.png` | 개별 타일 (0-padded 4자리) |

> **Important:** Kenney 팩은 JSON atlas를 제공하지 않음. 모든 atlas는 XML 포맷. 프로젝트의 JSON 파일들(`city_tilemap.json`, `characters_spritesheet.json` 등)은 프로젝트에서 자체 생성한 것.

---

## 6. Statistics

### Active Usage Rate

- **전체 2D 팩:** 151개
- **현재 사용 중:** 5개 (3.3%)
- **확장 후보:** ~15개 (9.9%)
- **미사용/비관련:** ~131개 (86.8%)

### Tile Count (Active Packs)

| Pack | Individual Tiles | Packed Tilemap |
|------|-----------------|----------------|
| Roguelike City | 1,036 | 37x28 = 1,036 |
| RPG Urban | 486 + 95 bonus | 27x18 = 486 |
| Roguelike Interior | ~300 | 27x18 tilesheet |
| Tiny Town | 132 | packed tilemap |
| Roguelike Characters | ~100 | 54x12 spritesheet |
| **Total** | **~2,149** | |

---

## 7. Recommendations

### Short-term (현재 이슈 해결)

1. `kenney-curation.json`의 32 tile slot 매핑이 Active 5개 팩만 참조 - 충분
2. Gap 에셋(arcade_cabinet 등)은 커스텀 스프라이트로 해결 완료

### Mid-term (기능 확장 시)

| 기능 | 추천 팩 | 이유 |
|------|---------|------|
| 던전 존 추가 | Roguelike Dungeon Pack | 동일 스타일 |
| 미니게임 | Tiny Battle, Sokoban Pack | 소규모 게임 에셋 |
| 사운드 시스템 | RPG Audio, UI Audio | RPG 테마 매칭 |
| UI 개선 | UI Adventure Pack | RPG 스타일 UI |
| 아이템 시스템 | Generic Items | 인벤토리 아이콘 |
| 입력 안내 | Input Prompts Pixel 16x | 16px 일관성 |

### Long-term (스타일 변경 시)

- Isometric 전환: `Isometric Tiles City`, `Isometric Medieval Town` 활용 가능
- 3D 전환: 53개 3D 팩 전체 활용 가능
