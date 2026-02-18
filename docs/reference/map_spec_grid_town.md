# Grid-Town Map Specification

The Grid-Town map defines the spatial structure of openClawWorld. Each zone represents a distinct context where different permissions and behaviors apply - the foundation of the **Space = State Machine** principle.

Based on reference image: `grid_town_layout.png`

## Map Dimensions

| Property | Value |
|----------|-------|
| Reference Image Size | 2048 x 2048 px |
| Tile Size | 16 x 16 px |
| Map Size (tiles) | 64 x 64 |
| Actual Map Size (px) | 1024 x 1024 |

> **Coordinate System Note:** All pixel coordinates in this document use the **2048x2048 reference image** coordinate space. To convert to in-game (1024x1024) coordinates:
> - `game_px = reference_px × 0.5`
> - Example: Reference (1024, 800) → Game (512, 400)

## Zone Boundaries (8 Zones)

| Zone | Zone ID | Pixel X | Pixel Y | Width | Height | Description |
|------|---------|---------|---------|-------|--------|-------------|
| Lobby | `lobby` | 192 | 64 | 384 | 384 | Reception, entrance, info boards |
| Office | `office` | 1344 | 64 | 640 | 448 | Workstations, kanban board |
| Central Park | `central-park` | 640 | 512 | 768 | 640 | Green space, benches, signpost |
| Arcade | `arcade` | 1408 | 512 | 576 | 512 | Game cabinets, entertainment |
| Meeting | `meeting` | 64 | 896 | 512 | 576 | Meeting rooms (Room A, Room C) |
| Lounge Cafe | `lounge-cafe` | 576 | 1216 | 640 | 448 | Cafe counter, seating |
| Plaza | `plaza` | 1216 | 1216 | 512 | 512 | Fountain, social hub |
| Lake | `lake` | 64 | 64 | 128 | 448 | Water feature (blocked) |

## Zone Layout (Visual)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAKE   │           LOBBY            │         OFFICE           │
│  (64,64)│         (192,64)           │       (1344,64)          │
│         │                            │                          │
├─────────┴────────────────────────────┼──────────────────────────┤
│                                      │                          │
│                                      │         ARCADE           │
│              CENTRAL PARK            │       (1408,512)         │
│                (640,512)             │                          │
│                                      │                          │
├──────────────────────────────────────┴──────────────────────────┤
│                │                     │                          │
│    MEETING     │    LOUNGE-CAFE      │         PLAZA            │
│   (64,896)     │     (576,1216)      │       (1216,1216)        │
│                │                     │                          │
└────────────────┴─────────────────────┴──────────────────────────┘
```

## Collision Rules

| Tile Type | Collision | Notes |
|-----------|-----------|-------|
| Grass (green) | No | Walkable |
| Roads (light gray) | No | Walkable |
| Plaza floor | No | Walkable |
| Building Walls (dark gray) | Yes | Not walkable |
| Building Interior (brown) | Yes | Not walkable |
| Water/Lake (blue) | Yes | Not walkable |

## Interactive Objects (Facilities)

### Lobby

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| reception-desk | desk | (256, 192) | 48 |
| info-board | board | (384, 128) | 32 |

### Office

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| kanban-board | board | (1728, 192) | 32 |
| desk-cluster | desk | (1536, 288) | 48 |
| whiteboard | board | (1856, 128) | 32 |

### Central Park

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| signpost | sign | (992, 768) | 32 |
| bench-park-1 | bench | (800, 640) | 32 |
| bench-park-2 | bench | (1184, 960) | 32 |

### Arcade

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| arcade-cabinet-1 | game | (1472, 576) | 32 |
| arcade-cabinet-2 | game | (1568, 576) | 32 |
| arcade-cabinet-3 | game | (1664, 576) | 32 |
| prize-counter | counter | (1600, 896) | 48 |

### Meeting

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| meeting-room-a | room | (192, 992) | 64 |
| meeting-room-c | room | (192, 1248) | 64 |
| schedule-board | board | (416, 992) | 32 |
| whiteboard | board | (320, 1120) | 32 |

### Lounge Cafe

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| cafe-counter | counter | (736, 1344) | 48 |
| vending-machine | machine | (928, 1344) | 32 |
| seating-area | seating | (800, 1536) | 64 |

### Plaza

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| fountain | decoration | (1440, 1440) | 64 |
| bench-1 | bench | (1312, 1312) | 32 |
| bench-2 | bench | (1568, 1568) | 32 |

## NPC Positions (9 NPCs)

| NPC ID | Name | Zone | Pixel Position | Role |
|--------|------|------|----------------|------|
| greeter | Sam the Greeter | lobby | (320, 256) | Welcome/guide |
| security | Max the Guard | lobby | (384, 192) | Security |
| office-pm | Jordan the PM | office | (1600, 320) | Project management |
| it-help | Casey IT Support | office | (1728, 256) | Tech support |
| ranger | River the Ranger | central-park | (1024, 800) | Park management |
| arcade-host | Drew the Game Master | arcade | (1600, 768) | Game host |
| meeting-host | Alex the Coordinator | meeting | (288, 1120) | Meeting coordination |
| barista | Jamie the Barista | lounge-cafe | (800, 1440) | Cafe service |
| fountain-keeper | Quinn the Keeper | plaza | (1440, 1344) | Plaza maintenance |

## Building Entrances

Building entrances are defined in the map's objects layer with `type: "building_entrance"`.

| Zone | Direction | Pixel Position | Connects To | Tile Position |
|------|-----------|----------------|-------------|---------------|
| lobby | south | (352, 416) | central-park | (11, 13) |
| office | west | (1344, 256) | lobby/road | (42, 8) |
| arcade | west | (1408, 736) | central-park | (44, 23) |
| meeting | east | (544, 1152) | central-park | (17, 36) |
| meeting | south | (320, 1440) | lounge-cafe | (10, 45) |
| lounge-cafe | north | (864, 1216) | central-park | (27, 38) |
| lounge-cafe | west | (576, 1472) | meeting | (18, 46) |
| plaza | north | (1440, 1216) | central-park | (45, 38) |

### Zone Connectivity Diagram

```
         LOBBY ──→ road ←── OFFICE
           ↓                
           ↓                
    MEETING ←─→ CENTRAL-PARK ←─→ ARCADE
       ↓              ↓
       ↓              ↓
       └──→ LOUNGE-CAFE ←── road ←── PLAZA
```

**Door Summary:**
- All zones connect to central-park/road network (hub model)
- Meeting ↔ Lounge-cafe: Direct connection via south/west doors
- Plaza: Connects via north door to road (then to central-park)

## Spawn Points

| Zone | Spawn Position (px) | Notes |
|------|---------------------|-------|
| lobby | (320, 256) | Entry zone - default spawn |
| office | (1600, 320) | Near kanban board |
| central-park | (1024, 800) | Center of park |
| arcade | (1600, 768) | Near game cabinets |
| meeting | (288, 1120) | Between meeting rooms |
| lounge-cafe | (800, 1440) | Near cafe counter |
| plaza | (1440, 1440) | Near fountain |
| lake | N/A | No spawn (blocked zone) |

## Layers

Required layers for map JSON:

1. **ground** - Base terrain (grass tiles, ID 1)
2. **collision** - Collision grid (0=passable, 1=blocked)
3. **objects** - Spawn points, facility markers

## Zone Colors (for debug display)

| Zone | Hex Color |
|------|-----------|
| lobby | #4A90D9 |
| office | #4682B4 |
| central-park | #228B22 |
| arcade | #9932CC |
| meeting | #8B4513 |
| lounge-cafe | #DAA520 |
| plaza | #808080 |
| lake | #4169E1 |
