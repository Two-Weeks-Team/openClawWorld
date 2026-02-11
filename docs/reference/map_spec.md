# Village World Map Specification

Based on reference image: `village_worklife_reference_2048x1650.png`

## Map Dimensions

| Property | Value |
|----------|-------|
| Reference Image Size | 2048 x 1650 px |
| Tile Size | 32 x 32 px |
| Map Size (tiles) | 64 x 52 |
| Actual Map Size (px) | 2048 x 1664 |

**Note**: Height adjusted from 1650 to 1664 (52 tiles) to align with tile grid.

## Zone Boundaries (Tile Coordinates)

Zones derived from reference image analysis (percentages converted to tile coords):

| Zone | Tile X Start | Tile Y Start | Width (tiles) | Height (tiles) | Pixel Bounds |
|------|--------------|--------------|---------------|----------------|--------------|
| Z_LOBBY | 6 | 3 | 23 | 13 | (192, 96) to (928, 512) |
| Z_OFFICE | 32 | 6 | 14 | 14 | (1024, 192) to (1472, 640) |
| Z_MEETING | 3 | 29 | 16 | 18 | (96, 928) to (608, 1504) |
| Z_LOUNGE | 22 | 29 | 16 | 10 | (704, 928) to (1216, 1248) |
| Z_ARCADE | 42 | 23 | 19 | 13 | (1344, 736) to (1952, 1152) |
| Z_PLAZA | 42 | 36 | 19 | 13 | (1344, 1152) to (1952, 1568) |

## Key Landmarks (Tile Coordinates)

### Water Features
| Feature | Tile Position | Size (tiles) |
|---------|--------------|--------------|
| West Pond | (10, 18) | 8 x 6 |
| Plaza Fountain | (51, 42) | 4 x 4 |
| Stream (near Plaza) | (42, 43) | 6 x 3 |

### Buildings & Structures
| Building | Entry Tile | Building Area |
|----------|------------|---------------|
| Lobby Building | (19, 14) | (12, 8) to (26, 18) |
| Office Building | (35, 19) | (32, 10) to (46, 22) |
| Meeting Building (West) | (17, 39) | (8, 35) to (22, 48) |
| Lounge Building | (31, 40) | (28, 38) to (38, 44) |
| Arcade Structure | (51, 35) | (45, 30) to (58, 40) |
| Meeting Rooms A/B/C | (5, 44), (10, 44), (15, 44) | 4x4 each |

### Pathways (Stone Roads)
| Path | Start Tile | End Tile | Width |
|------|------------|----------|-------|
| Central Horizontal | (0, 23) | (64, 23) | 3 tiles |
| West Vertical | (19, 0) | (19, 52) | 2 tiles |
| East Vertical | (45, 10) | (45, 52) | 2 tiles |
| South Perimeter | (0, 49) | (64, 49) | 2 tiles |
| Plaza Loop | (42, 36) to (60, 48) | circular | 2 tiles |

## Interactive Objects (Facility Positions)

### Z_LOBBY
| Object | Type | Tile Position | Interaction Radius |
|--------|------|---------------|-------------------|
| lobby.reception_desk | reception_desk | (19, 12) | 48 |
| lobby.notice_board | notice_board | (8, 9) | 32 |
| lobby.reception_gate | gate | (21, 22) | 48 |
| lobby.pond_bridge | pond_edge | (12, 20) | 32 |
| lobby.info_board | notice_board | (10, 24) | 32 |

### Z_OFFICE
| Object | Type | Tile Position | Interaction Radius |
|--------|------|---------------|-------------------|
| office.kanban_terminal | kanban_terminal | (35, 10) | 32 |
| office.whiteboard | whiteboard | (35, 11) | 32 |
| office.printer | printer | (44, 14) | 32 |
| office.desk_cluster | object | (38, 15) | 64 |
| office.watercooler | watercooler | (46, 18) | 32 |

### Z_MEETING
| Object | Type | Tile Position | Interaction Radius |
|--------|------|---------------|-------------------|
| meeting.schedule_kiosk | schedule_kiosk | (16, 35) | 32 |
| meeting.voting_kiosk | voting_kiosk | (12, 39) | 32 |
| meeting.roomA_door | room_door_a | (5, 44) | 32 |
| meeting.roomB_door | room_door_b | (10, 44) | 32 |
| meeting.roomC_door | room_door_c | (15, 44) | 32 |
| meeting.agenda_panel | agenda_panel | (18, 38) | 32 |

### Z_LOUNGE
| Object | Type | Tile Position | Interaction Radius |
|--------|------|---------------|-------------------|
| lounge.cafe_counter | cafe_counter | (31, 35) | 48 |
| lounge.vending_machine | vending_machine | (24, 33) | 32 |
| lounge.seating_deck | object | (28, 38) | 64 |

### Z_ARCADE
| Object | Type | Tile Position | Interaction Radius |
|--------|------|---------------|-------------------|
| arcade.arcade_cabinets | game_table | (45, 31) | 48 |
| arcade.small_stage | stage | (51, 28) | 64 |
| arcade.prize_counter | cafe_counter | (58, 30) | 32 |

### Z_PLAZA
| Object | Type | Tile Position | Interaction Radius |
|--------|------|---------------|-------------------|
| plaza.fountain | fountain | (51, 42) | 64 |
| plaza.bench_north | object | (48, 38) | 32 |
| plaza.bench_south | object | (54, 46) | 32 |
| plaza.signpost | onboarding_signpost | (47, 40) | 32 |

## NPC Spawn Positions

| NPC ID | Zone | Spawn Tile | Default State |
|--------|------|------------|---------------|
| receptionist | lobby | (20, 12) | working |
| security-guard | lobby | (22, 21) | working |
| tutorial-guide | lobby | (15, 16) | idle |
| pm | office | (36, 14) | working |
| it-help | office | (40, 16) | working |
| hr | office | (42, 12) | working |
| meeting-host | meeting | (15, 36) | working |
| barista | lounge | (32, 34) | working |
| arcade-host | arcade | (50, 30) | working |
| event-host | arcade | (52, 28) | idle |
| sales-rep | plaza | (50, 42) | walking |
| quest-giver | plaza | (48, 44) | idle |

## Layers

Required layers for Tiled export:

1. **ground** - Base terrain (grass, water, stone paths)
2. **decoration** - Non-collidable decorations (flowers, small plants)
3. **building** - Building exteriors and roofs
4. **collision** - Collision tiles (walls, water edges, obstacles)
5. **triggers** - Zone entry triggers, interaction zones
6. **objects** - Interactive objects (facilities, spawn points)

## Collision Rules

| Tile Type | Collision | Notes |
|-----------|-----------|-------|
| Grass | No | Walkable |
| Stone Path | No | Walkable |
| Water | Yes | Not walkable |
| Water Edge (shallow) | No | Walkable for pond_edge interactions |
| Building Wall | Yes | Not walkable |
| Tree | Yes | Not walkable |
| Furniture | Yes | Must interact from adjacent tile |
| Fence | Yes | Not walkable |

## Spawn Points

| Zone | Primary Spawn | Additional Spawns |
|------|--------------|-------------------|
| lobby | (20, 20) | (15, 22), (25, 18) |
| office | (35, 18) | (40, 15) |
| meeting | (16, 38) | (10, 42) |
| lounge | (30, 36) | (26, 38) |
| arcade | (48, 32) | (54, 34) |
| plaza | (50, 40) | (46, 44), (54, 42) |

## Asset Requirements

### Tileset (worklife_village_tiles.png)
- Minimum 256 unique tiles
- 32x32 pixels per tile
- Categories: ground, water, paths, buildings, vegetation, furniture

### Object Sprites (separate sprite sheet)
- Reception desk, counters
- Kiosks (schedule, voting, kanban)
- Furniture (desks, chairs, tables)
- Machines (vending, arcade, printer)
- Decorations (fountain, signs, boards)

### NPC Sprites (existing SVG system)
- 12 NPC character sprites with 4 directions
- Walking animations (4 frames per direction)
