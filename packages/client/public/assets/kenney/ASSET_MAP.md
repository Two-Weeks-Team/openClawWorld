# Kenney Asset Map

## Source

- **Kenney Game Assets All-in-1 3.3.0**
- License: CC0 (Public Domain)
- Tile Size: 16x16 pixels (native)

## Asset Files

| File                                    | Source Pack               | Size    | Description                        |
| --------------------------------------- | ------------------------- | ------- | ---------------------------------- |
| `tiles/city_tilemap.png`                | Roguelike City Pack       | 592x448 | 도시, 도로, 건물 타일 (1036 tiles) |
| `tiles/city_tilemap_spacing.png`        | Roguelike City Pack       | -       | 1px spacing 버전                   |
| `tiles/tinytown_tilemap.png`            | Tiny Town                 | -       | 추가 자연물, 건물                  |
| `interior/interior_tilemap.png`         | Roguelike Interior Pack   | 458x305 | 실내 가구, 장식                    |
| `characters/characters_spritesheet.png` | Roguelike Characters Pack | 918x203 | NPC, 플레이어 캐릭터               |

## Tile Specifications

All tiles are:

- **Size**: 16x16 pixels
- **Spacing**: 1px margin between tiles
- **Format**: PNG with transparency

## Zone Asset Mapping

### Lobby (리셉션)

| Asset          | Tilemap  | Tile ID | Description   |
| -------------- | -------- | ------- | ------------- |
| Reception desk | city     | TBD     | 리셉션 데스크 |
| Sofa           | interior | TBD     | 소파/의자     |
| Sign           | city     | TBD     | 안내판        |
| Carpet         | interior | TBD     | 카펫          |
| Plant          | interior | TBD     | 화분          |

### Office (업무)

| Asset          | Tilemap  | Tile ID | Description   |
| -------------- | -------- | ------- | ------------- |
| Desk           | interior | TBD     | 책상          |
| Chair          | interior | TBD     | 의자          |
| Computer       | interior | TBD     | 컴퓨터/모니터 |
| Filing cabinet | interior | TBD     | 서류함        |
| Whiteboard     | interior | TBD     | 화이트보드    |

### Cafe (휴식)

| Asset          | Tilemap  | Tile ID | Description |
| -------------- | -------- | ------- | ----------- |
| Table          | interior | TBD     | 테이블      |
| Chair          | interior | TBD     | 의자        |
| Counter        | interior | TBD     | 카운터      |
| Coffee machine | interior | TBD     | 커피머신    |
| Menu board     | interior | TBD     | 메뉴판      |

### Arcade (엔터테인먼트)

| Asset        | Tilemap  | Tile ID | Description |
| ------------ | -------- | ------- | ----------- |
| Game machine | interior | TBD     | 게임기      |
| Poster       | interior | TBD     | 포스터      |
| Neon         | interior | TBD     | 네온 장식   |

### Meeting (협업)

| Asset         | Tilemap  | Tile ID | Description     |
| ------------- | -------- | ------- | --------------- |
| Meeting table | interior | TBD     | 회의 테이블     |
| Chair         | interior | TBD     | 의자            |
| Projector     | interior | TBD     | 프로젝터/스크린 |
| Whiteboard    | interior | TBD     | 화이트보드      |

### Park (자연)

| Asset  | Tilemap       | Tile ID | Description |
| ------ | ------------- | ------- | ----------- |
| Tree   | city/tinytown | TBD     | 나무        |
| Grass  | city          | TBD     | 잔디 타일   |
| Bench  | city          | TBD     | 벤치        |
| Flower | tinytown      | TBD     | 꽃          |

### Plaza (광장)

| Asset      | Tilemap | Tile ID | Description |
| ---------- | ------- | ------- | ----------- |
| Fountain   | city    | TBD     | 분수        |
| Lamp       | city    | TBD     | 조명        |
| Floor tile | city    | TBD     | 바닥 타일   |

### Lake (호수)

| Asset | Tilemap  | Tile ID | Description |
| ----- | -------- | ------- | ----------- |
| Water | city     | TBD     | 물 타일     |
| Dock  | city     | TBD     | 독/보트     |
| Reed  | tinytown | TBD     | 갈대        |

## NPC Character Mapping

| NPC ID          | Character | Row | Col | Description         |
| --------------- | --------- | --- | --- | ------------------- |
| greeter         | Human 1   | 0   | 2   | 리셉션 - 친근함     |
| security        | Guard     | 0   | 3   | 경비 - 유니폼       |
| office-pm       | Business  | 0   | 4   | PM - 비즈니스캐주얼 |
| it-help         | Tech      | 0   | 5   | IT지원 - 캐주얼     |
| meeting-host    | Formal    | 0   | 6   | 회의진행 - 정장     |
| barista         | Service   | 0   | 7   | 바리스타 - 앞치마   |
| arcade-host     | Casual    | 0   | 8   | 아케이드 - 캐주얼   |
| ranger          | Outdoor   | 0   | 9   | 공원관리 - 녹색     |
| fountain-keeper | Worker    | 0   | 10  | 분수관리 - 작업복   |

## Player Character Mapping

| Type          | Character | Row | Col | Description     |
| ------------- | --------- | --- | --- | --------------- |
| player-human  | Human     | 0   | 0   | 사람 플레이어   |
| player-agent  | Robot/Alt | 0   | 1   | AI 에이전트     |
| player-object | Box       | -   | -   | 오브젝트 엔티티 |

## Usage in Phaser

```typescript
// Load tilemap
this.load.image('city-tiles', 'assets/kenney/tiles/city_tilemap.png');

// Load character atlas
this.load.atlas(
  'characters',
  'assets/kenney/characters/characters_spritesheet.png',
  'assets/kenney/characters/characters_spritesheet.json'
);

// Use character sprite
this.add.sprite(x, y, 'characters', 'npc-greeter');
```
