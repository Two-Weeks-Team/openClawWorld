# Grid-Town Map Specification

Based on reference image: `grid_town_layout.png`

## Map Dimensions

| Property | Value |
|----------|-------|
| Reference Image Size | 2048 x 2048 px |
| Tile Size | 32 x 32 px |
| Map Size (tiles) | 64 x 64 |
| Actual Map Size (px) | 2048 x 2048 |

## Zone Boundaries (Tile Coordinates)

| Zone | Tile X Start | Tile Y Start | Width (tiles) | Height (tiles) | Pixel Bounds |
|------|--------------|--------------|---------------|----------------|--------------|
| Z_PLAZA | 24 | 24 | 16 | 16 | (768, 768) to (1280, 1280) |
| Z_NORTH_BLOCK | 18 | 4 | 28 | 16 | (576, 128) to (1472, 640) |
| Z_WEST_BLOCK | 4 | 18 | 16 | 28 | (128, 576) to (640, 1472) |
| Z_EAST_BLOCK | 44 | 18 | 16 | 20 | (1408, 576) to (1920, 1216) |
| Z_SOUTH_BLOCK | 12 | 44 | 28 | 16 | (384, 1408) to (1280, 1920) |
| Z_LAKE | 44 | 44 | 18 | 18 | (1408, 1408) to (1984, 1984) |

## Layout Description

- **Central Plaza**: Large 16x16 tile gray square in center - main social hub
- **Roads**: Vertical road through center (x=32), horizontal road (y=32) creating cross pattern
- **North Block**: 3 buildings at top - office area
- **West Block**: 3 buildings on left - cafe/lounge area
- **East Block**: 2 buildings on right - meeting rooms
- **South Block**: 3 buildings at bottom - arcade/recreation
- **Lake**: Blue water area in bottom-right corner

## Collision Rules

| Tile Type | Collision | Notes |
|-----------|-----------|-------|
| Grass (green) | No | Walkable |
| Roads (light gray) | No | Walkable |
| Plaza (light gray) | No | Walkable |
| Building Walls (dark gray) | Yes | Not walkable |
| Building Interior (brown) | Yes | Not walkable (MVP - no door openings) |
| Water/Lake (blue) | Yes | Not walkable |

## Interactive Objects (Facility Positions)

### Z_PLAZA
| Object | Type | Tile Position | Pixel Position | Interaction Radius |
|--------|------|---------------|----------------|-------------------|
| plaza.notice_board | notice_board | (32, 28) | (1024, 896) | 48 |
| plaza.signpost | onboarding_signpost | (30, 32) | (960, 1024) | 32 |

### Z_NORTH_BLOCK
| Object | Type | Tile Position | Pixel Position | Interaction Radius |
|--------|------|---------------|----------------|-------------------|
| north.office_terminal | kanban_terminal | (32, 8) | (1024, 256) | 32 |
| north.whiteboard | whiteboard | (28, 8) | (896, 256) | 32 |

### Z_EAST_BLOCK
| Object | Type | Tile Position | Pixel Position | Interaction Radius |
|--------|------|---------------|----------------|-------------------|
| east.meeting_kiosk | schedule_kiosk | (48, 24) | (1536, 768) | 32 |
| east.room_door_A | room_door_a | (50, 26) | (1600, 832) | 32 |

### Z_WEST_BLOCK
| Object | Type | Tile Position | Pixel Position | Interaction Radius |
|--------|------|---------------|----------------|-------------------|
| west.cafe_counter | cafe_counter | (8, 32) | (256, 1024) | 48 |
| west.vending_machine | vending_machine | (12, 28) | (384, 896) | 32 |

### Z_SOUTH_BLOCK
| Object | Type | Tile Position | Pixel Position | Interaction Radius |
|--------|------|---------------|----------------|-------------------|
| south.arcade_cabinet | game_table | (20, 48) | (640, 1536) | 48 |

### Z_LAKE
| Object | Type | Tile Position | Pixel Position | Interaction Radius |
|--------|------|---------------|----------------|-------------------|
| lake.viewpoint | pond_edge | (42, 42) | (1344, 1344) | 32 |

## NPC Spawn Positions

| NPC ID | Zone | Spawn Tile | Pixel Position | Default State |
|--------|------|------------|----------------|---------------|
| greeter | plaza | (32, 32) | (1024, 1024) | idle |
| office-pm | north-block | (32, 10) | (1024, 320) | working |
| meeting-host | east-block | (51, 25) | (1632, 800) | working |
| barista | west-block | (10, 32) | (320, 1024) | working |
| arcade-host | south-block | (20, 51) | (640, 1632) | idle |
| ranger | lake | (44, 44) | (1408, 1408) | idle |

## Spawn Points

| Zone | Primary Spawn Tile | Primary Spawn Pixel |
|------|-------------------|---------------------|
| plaza | (32, 32) | (1024, 1024) |
| north-block | (32, 10) | (1024, 320) |
| west-block | (10, 32) | (320, 1024) |
| east-block | (51, 25) | (1632, 800) |
| south-block | (20, 51) | (640, 1632) |
| lake | (44, 44) | (1408, 1408) |

## Layers

Required layers for map JSON:

1. **ground** - Base terrain (grass tiles, ID 1)
2. **collision** - Collision grid (0=passable, 1=blocked)
3. **objects** - Spawn points, facility markers
