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

> **Coordinate System Note:** All pixel coordinates in this document use **in-game (1024x1024) coordinates**, matching `packages/shared/src/world.ts`. The reference image is 2048x2048; multiply game coordinates by 2 to map back to the reference image.

## Zone Boundaries (8 Zones)

Source of truth: `ZONE_BOUNDS` in `packages/shared/src/world.ts`

| Zone | Zone ID | Pixel X | Pixel Y | Width | Height | Description |
|------|---------|---------|---------|-------|--------|-------------|
| Lobby | `lobby` | 96 | 32 | 192 | 192 | Reception, entrance, info boards |
| Office | `office` | 672 | 32 | 320 | 224 | Workstations, kanban board |
| Central Park | `central-park` | 320 | 256 | 384 | 320 | Green space, benches, signpost |
| Arcade | `arcade` | 704 | 256 | 288 | 256 | Game cabinets, entertainment |
| Meeting | `meeting` | 32 | 448 | 256 | 288 | Meeting rooms (Room A, Room C) |
| Lounge Cafe | `lounge-cafe` | 288 | 608 | 320 | 224 | Cafe counter, seating |
| Plaza | `plaza` | 608 | 608 | 256 | 256 | Fountain, social hub |
| Lake | `lake` | 32 | 32 | 64 | 224 | Water feature (blocked) |

## Zone Layout (Visual)

```
┌─────────────────────────────────────────────────────────────────┐
│  LAKE   │           LOBBY            │         OFFICE           │
│  (32,32)│         (96,32)            │       (672,32)           │
│         │                            │                          │
├─────────┴────────────────────────────┼──────────────────────────┤
│                                      │                          │
│                                      │         ARCADE           │
│              CENTRAL PARK            │       (704,256)          │
│                (320,256)             │                          │
│                                      │                          │
├──────────────────────────────────────┴──────────────────────────┤
│                │                     │                          │
│    MEETING     │    LOUNGE-CAFE      │         PLAZA            │
│   (32,448)     │     (288,608)       │       (608,608)          │
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
| reception-desk | desk | (128, 96) | 48 |
| info-board | board | (192, 64) | 32 |

### Office

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| kanban-board | board | (864, 96) | 32 |
| desk-cluster | desk | (768, 144) | 48 |
| whiteboard | board | (928, 64) | 32 |

### Central Park

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| signpost | sign | (496, 384) | 32 |
| bench-park-1 | bench | (400, 320) | 32 |
| bench-park-2 | bench | (592, 480) | 32 |

### Arcade

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| arcade-cabinet-1 | game | (736, 288) | 32 |
| arcade-cabinet-2 | game | (784, 288) | 32 |
| arcade-cabinet-3 | game | (832, 288) | 32 |
| prize-counter | counter | (800, 448) | 48 |

### Meeting

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| meeting-room-a | room | (96, 496) | 64 |
| meeting-room-c | room | (96, 624) | 64 |
| schedule-board | board | (208, 496) | 32 |
| whiteboard | board | (160, 560) | 32 |

### Lounge Cafe

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| cafe-counter | counter | (368, 672) | 48 |
| vending-machine | machine | (464, 672) | 32 |
| seating-area | seating | (400, 768) | 64 |

### Plaza

| Object | Type | Pixel Position | Interaction Radius |
|--------|------|----------------|-------------------|
| fountain | decoration | (720, 720) | 64 |
| bench-1 | bench | (656, 656) | 32 |
| bench-2 | bench | (784, 784) | 32 |

## NPC Positions (9 NPCs)

| NPC ID | Name | Zone | Pixel Position | Role |
|--------|------|------|----------------|------|
| greeter | Sam the Greeter | lobby | (160, 128) | Welcome/guide |
| security | Max the Guard | lobby | (192, 96) | Security |
| office-pm | Jordan the PM | office | (800, 160) | Project management |
| it-help | Casey IT Support | office | (864, 128) | Tech support |
| ranger | River the Ranger | central-park | (512, 400) | Park management |
| arcade-host | Drew the Game Master | arcade | (800, 384) | Game host |
| meeting-host | Alex the Coordinator | meeting | (144, 560) | Meeting coordination |
| barista | Jamie the Barista | lounge-cafe | (400, 720) | Cafe service |
| fountain-keeper | Quinn the Keeper | plaza | (720, 672) | Plaza maintenance |

## Building Entrances

Building entrances are defined in the map's objects layer with `type: "building_entrance"`.

| Zone | Direction | Pixel Position | Connects To | Tile Position |
|------|-----------|----------------|-------------|---------------|
| lobby | south | (176, 208) | central-park | (11, 13) |
| office | west | (672, 128) | lobby/road | (42, 8) |
| arcade | west | (704, 368) | central-park | (44, 23) |
| meeting | east | (272, 576) | central-park | (17, 36) |
| meeting | south | (160, 720) | lounge-cafe | (10, 45) |
| lounge-cafe | north | (432, 608) | central-park | (27, 38) |
| lounge-cafe | west | (288, 736) | meeting | (18, 46) |
| plaza | north | (720, 608) | central-park | (45, 38) |

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
| lobby | (160, 128) | Entry zone - default spawn |
| office | (800, 160) | Near kanban board |
| central-park | (512, 400) | Center of park |
| arcade | (800, 384) | Near game cabinets |
| meeting | (144, 560) | Between meeting rooms |
| lounge-cafe | (400, 720) | Near cafe counter |
| plaza | (720, 720) | Near fountain |
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
