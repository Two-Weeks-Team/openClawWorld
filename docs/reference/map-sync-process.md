# Map Synchronization Process

This document describes how to synchronize map files, tile data, zones, and related assets across the codebase.

## Overview

The map system in openClawWorld has a **single source of truth** in the world pack, which gets synchronized to server and client packages.

```
world/packs/base/maps/grid_town_outdoor.json  (SOURCE)
         |
         +-- sync-maps.mjs -->
         |
         +-- packages/server/assets/maps/village.json  (SERVER COPY)
         +-- packages/client/public/assets/maps/village.json  (CLIENT COPY)
```

## File Locations

| Purpose | Path | Description |
|---------|------|-------------|
| **Source Map** | `world/packs/base/maps/grid_town_outdoor.json` | Master Tiled JSON map |
| **Server Map** | `packages/server/assets/maps/village.json` | Server's collision/spawn data |
| **Client Map** | `packages/client/public/assets/maps/village.json` | Client's rendering data |
| **Sync Script** | `scripts/sync-maps.mjs` | Copies source to server/client |
| **Zone Bounds** | `packages/shared/src/world.ts` | Zone pixel coordinates |
| **Tile Interpreter** | `packages/client/src/world/TileInterpreter.ts` | Client tile rendering |
| **World Pack Manifest** | `world/packs/base/manifest.json` | World pack metadata |

## Sync Script Usage

```bash
# Run from project root
node scripts/sync-maps.mjs

# Output:
# Syncing maps from world pack...
# Maps synced successfully:
#   Source: /path/to/world/packs/base/maps/grid_town_outdoor.json
#   -> Server: /path/to/packages/server/assets/maps/village.json
#   -> Client: /path/to/packages/client/public/assets/maps/village.json
#
# MD5 checksums:
#   abc123...  (all three should match)
```

**Verify sync worked**: All three MD5 checksums should be identical.

## Map JSON Structure

The Tiled JSON map has three critical layers:

### 1. Ground Layer (`ground`)

Contains tile IDs for visual rendering:

| Tile ID | Meaning | Visual |
|---------|---------|--------|
| 1 | Grass | Green terrain |
| 2 | Road | Light gray path |
| 3 | Water (Lake) | Blue water |
| 4 | Stone Wall | Dark gray brick (collision) |
| 5 | Wood Floor | Brown wood (Lobby, Meeting, Lounge) |
| 6 | Forest | Dark green trees |
| 7 | Sand | Beige sand (Plaza) |
| 9 | Light Wall | Light gray floor (Office) |
| 13 | Carpet | Purple rug (Arcade) |

### 2. Collision Layer (`collision`)

Binary collision data:

| Value | Meaning |
|-------|---------|
| 0 | Passable (walkable) |
| 1 | Blocked (collision) |

### 3. Objects Layer (`objects`)

Contains spawn points, building entrances, and facility markers for navigation and gameplay.

## Map Data Array Structure

The map is 64x64 tiles. Each layer's `data` array has 4096 elements (64 * 64).

### Tile Index Formula

```
index = y * width + x
index = y * 64 + x
```

**Examples:**
| Tile (x, y) | Index | Calculation |
|-------------|-------|-------------|
| (0, 0) | 0 | 0 * 64 + 0 |
| (10, 0) | 10 | 0 * 64 + 10 |
| (0, 5) | 320 | 5 * 64 + 0 |
| (10, 5) | 330 | 5 * 64 + 10 |
| (63, 63) | 4095 | 63 * 64 + 63 |

### Reading Tile Data

```javascript
// Get tile at position (x, y)
function getTile(data, x, y) {
  return data[y * 64 + x];
}

// Set tile at position (x, y)
function setTile(data, x, y, value) {
  data[y * 64 + x] = value;
}
```

## Building/Wall Placement

Buildings require BOTH layers to be set correctly:

### Ground + Collision Relationship

| Ground Tile | Collision | Result |
|-------------|-----------|--------|
| 4 (building) | 1 | Wall - blocked, dark gray |
| 5 (lounge) | 1 | Interior - blocked, brown |
| 6 (plaza) | 0 | Floor - walkable, gray stone |
| 1 (grass) | 0 | Grass - walkable, green |
| 2 (road) | 0 | Road - walkable, light gray |
| 3 (water) | 1 | Lake - blocked, blue |

**Critical Rule**: Ground tile ID alone does NOT block movement. Collision layer determines walkability.

### Building Creation Process

To create a building (e.g., 6x4 tiles at position 10,5):

```javascript
// 1. Define building area
const buildingX = 10, buildingY = 5;
const buildingW = 6, buildingH = 4;

// 2. Fill ground layer with building tile (4)
for (let y = buildingY; y < buildingY + buildingH; y++) {
  for (let x = buildingX; x < buildingX + buildingW; x++) {
    groundData[y * 64 + x] = 4;  // Building tile
  }
}

// 3. Fill collision layer with blocked (1)
for (let y = buildingY; y < buildingY + buildingH; y++) {
  for (let x = buildingX; x < buildingX + buildingW; x++) {
    collisionData[y * 64 + x] = 1;  // Blocked
  }
}

// 4. Create door (2 tiles on south side, at y = buildingY + buildingH - 1)
const doorY = buildingY + buildingH - 1;
const doorX1 = buildingX + 2;
const doorX2 = buildingX + 3;
collisionData[doorY * 64 + doorX1] = 0;  // Door tile 1 - passable
collisionData[doorY * 64 + doorX2] = 0;  // Door tile 2 - passable
```

### Wall Pattern Examples

**Solid Wall (no entry):**
```
Ground:    [4, 4, 4, 4]    Collision: [1, 1, 1, 1]
```

**Wall with Door:**
```
Ground:    [4, 4, 4, 4]    Collision: [1, 0, 0, 1]
                                       ^door^
```

**Building Interior (blocked):**
```
Ground:    [4, 4, 4, 4]    Collision: [1, 1, 1, 1]
           [4, 5, 5, 4]               [1, 1, 1, 1]
           [4, 5, 5, 4]               [1, 1, 1, 1]
           [4, 4, 4, 4]               [1, 0, 0, 1]  <- door
```

### Current Building Boundaries (Tile Coordinates)

| Zone | Top-Left (x,y) | Size (w×h) | Door Location |
|------|----------------|------------|---------------|
| lobby | (6, 2) | (12×12) | South: (11,13), (12,13) |
| office | (42, 2) | (20×14) | West: (42,8), (42,9) |
| arcade | (44, 16) | (18×16) | West: (44,23), (44,24) |
| meeting | (2, 28) | (16×18) | East: (17,36), (17,37) |
| lounge-cafe | (18, 38) | (20×14) | North: (27,38), (28,38) |
| plaza | (38, 38) | (16×16) | West: (38,45), (38,46) |
| lake | (2, 2) | (4×14) | None (water, always blocked) |

## Zone Bounds Definition

Zone bounds are defined in `packages/shared/src/world.ts`:

```typescript
export const ZONE_BOUNDS: Record<ZoneId, ZoneBounds> = {
  lobby:        { x: 192, y: 64, width: 384, height: 384 },
  office:       { x: 1344, y: 64, width: 640, height: 448 },
  'central-park': { x: 640, y: 512, width: 768, height: 640 },
  arcade:       { x: 1408, y: 512, width: 576, height: 512 },
  meeting:      { x: 64, y: 896, width: 512, height: 576 },
  'lounge-cafe': { x: 576, y: 1216, width: 640, height: 448 },
  plaza:        { x: 1216, y: 1216, width: 512, height: 512 },
  lake:         { x: 64, y: 64, width: 128, height: 448 },
};
```

**Coordinate system**: All values are in **pixels** (not tiles). Tile size is 32x32 px.

To convert:
- Pixel to Tile: `tileX = Math.floor(pixelX / 32)`
- Tile to Pixel: `pixelX = tileX * 32`

## Building Entrances

Building entrances are defined in the map's objects layer as `type: "building_entrance"`.

### Entrance Object Format

```json
{
  "id": 1,
  "name": "lobby.entrance",
  "type": "building_entrance",
  "x": 352,
  "y": 416,
  "width": 64,
  "height": 32,
  "properties": [
    { "name": "zone", "type": "string", "value": "lobby" },
    { "name": "direction", "type": "string", "value": "south" },
    { "name": "connectsTo", "type": "string", "value": "central-park" }
  ]
}
```

### Current Building Entrances

| Zone | Direction | Pixel Position | Connects To |
|------|-----------|----------------|-------------|
| lobby | south | (352, 416) | central-park |
| office | west | (1344, 256) | lobby/road |
| arcade | west | (1408, 736) | central-park |
| meeting | east | (544, 1152) | central-park |
| meeting | south | (320, 1440) | lounge-cafe |
| lounge-cafe | north | (864, 1216) | central-park |
| lounge-cafe | west | (576, 1408) | meeting |
| plaza | north | (1440, 1216) | central-park |

### Zone Connectivity

Physical layout and door connections:

```
    ┌──────────┐              ┌────────────────────┐
    │   LAKE   │              │                    │
    │  (blocked)              │       LOBBY        │
    └──────────┘              │         ↓ south    │
                              └────────────────────┘
                                        │
    ┌─────────────────────────┐         │         ┌────────────────────┐
    │                         │         ↓         │                    │
    │                         │    ═══ ROAD ═══   │      OFFICE        │
    │                         │         │         │    ← west          │
    │       MEETING           │         │         └────────────────────┘
    │         ↓ east ─────────┼────→ CENTRAL ←────┼──── ARCADE ← west
    │         ↓               │       PARK        │
    │         ↓ south         │         ↓         └────────────────────┘
    └─────────┼───────────────┘         │
              │                         │         ┌────────────────────┐
              ↓                         ↓         │                    │
    ┌─────────┼───────────────────────────────────┤      PLAZA         │
    │         ↓ west                    ↑ north   │    ↑ north         │
    │     LOUNGE-CAFE                             │                    │
    │                                             └────────────────────┘
    └─────────────────────────────────────────────┘
```

Simplified path diagram:
```
         LOBBY ──→ road ←── OFFICE
           ↓                
           ↓                
    MEETING ←─→ CENTRAL-PARK ←─→ ARCADE
       ↓              ↓
       ↓              ↓
       └──→ LOUNGE-CAFE ←─→ road ←── PLAZA
```

## Door Placement Rules

Building doors must face roads or open areas for NPC/player access.

### Door Tiles (Collision Layer)

| Zone | Door Side | Door Tiles (x, y) | Collision Value |
|------|-----------|-------------------|-----------------|
| lobby | South | (11, 13), (12, 13) | 0 (passable) |
| office | West | (42, 8), (42, 9) | 0 (passable) |
| arcade | West | (44, 23), (44, 24) | 0 (passable) |
| meeting | East | (17, 36), (17, 37) | 0 (passable) |
| meeting | South | (10, 45), (11, 45) | 0 (passable) |
| lounge-cafe | North | (27, 38), (28, 38) | 0 (passable) |
| lounge-cafe | West | (18, 46), (18, 47) | 0 (passable) |
| plaza | North | (45, 38), (46, 38) | 0 (passable) |

### Door Placement Process

1. Identify building boundary tiles (collision=1)
2. Determine which side faces a road or open area
3. Clear 2 tiles on that side (set collision=0)
4. Add `building_entrance` object to objects layer
5. Set properties: `zone`, `direction`, `connectsTo`

## Making Map Changes

### Step-by-Step Process

1. **Edit the source map**:
   ```
   world/packs/base/maps/grid_town_outdoor.json
   ```

2. **Run sync script**:
   ```bash
   node scripts/sync-maps.mjs
   ```

3. **Rebuild packages**:
   ```bash
   pnpm build
   ```

4. **Verify changes**:
   ```bash
   # Start server and client
   pnpm dev:server & pnpm dev:client
   # Open http://localhost:5173, press F3 for debug overlay
   ```

### If Changing Zone Bounds

When zone boundaries change, update these files:

1. **Zone bounds** - `packages/shared/src/world.ts`
   - `ZONE_BOUNDS` - pixel coordinates
   - `ZONE_IDS` - zone ID array

2. **Tile interpreter** - `packages/client/src/world/TileInterpreter.ts`
   - `ZONE_FLOOR_TYPES` - tile ID per zone

3. **Zone banner** - `packages/client/src/ui/ZoneBanner.ts`
   - `ZONE_DISPLAY_NAMES` - human-readable names

4. **World pack manifest** - `world/packs/base/manifest.json`
   - `zones` array
   - `entryZone` if entry point changes

5. **NPC positions** - `world/packs/base/npcs/*.json`
   - Update NPC zone assignments and positions

6. **Server world loader** - `packages/server/src/world/WorldPackLoader.ts`
   - Zone-based NPC/facility mappings

### If Changing Collision

1. Edit the `collision` layer in the source map
2. Each tile is either `0` (passable) or `1` (blocked)
3. Run sync script
4. Server collision check will use the new data

## Verification Checklist

After any map change:

- [ ] MD5 checksums match (source, server, client)
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] Server starts without errors
- [ ] Client renders map correctly
- [ ] F3 debug shows correct collision overlay
- [ ] NPCs spawn in correct zones
- [ ] Player can walk through doors
- [ ] Player cannot walk through walls

## Testing Collision

### Server-side (API test)

```bash
# Test blocked tile (lake at 3,3)
curl -X POST http://localhost:2567/aic/v0.1/moveTo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"agentId": "test", "roomId": "default", "x": 96, "y": 96}'
# Expected: {"result": "rejected", "reason": "blocked"}

# Test passable tile (central park at 25,25)
curl -X POST http://localhost:2567/aic/v0.1/moveTo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"agentId": "test", "roomId": "default", "x": 800, "y": 800}'
# Expected: {"result": "accepted"}
```

### Client-side (visual)

1. Open game at http://localhost:5173
2. Press F3 to toggle debug overlay
3. Red tiles = blocked, no overlay = passable
4. Try clicking on red tiles - movement should be rejected

## Troubleshooting

### Maps out of sync

**Symptom**: Server and client behave differently

**Fix**: Run `node scripts/sync-maps.mjs` and verify MD5 checksums match

### Collision not working

**Symptom**: Player walks through walls

**Fix**: 
1. Check collision layer has `1` for blocked tiles
2. Run sync script
3. Rebuild and restart

### Zone detection wrong

**Symptom**: Wrong zone name in UI

**Fix**: 
1. Check `ZONE_BOUNDS` in `packages/shared/src/world.ts`
2. Verify pixel coordinates are correct
3. Remember: values are pixels, not tiles

### NPCs in wrong location

**Symptom**: NPCs appear outside their zone

**Fix**:
1. Check NPC JSON in `world/packs/base/npcs/`
2. Update `position.x` and `position.y` (pixels)
3. Verify position is within zone bounds

### Ground/Collision mismatch

**Symptom**: Visual shows building but player walks through, OR player blocked on grass

**Cause**: Ground layer and collision layer are out of sync

**Fix**:
1. Verify ground tile 4 (building) always has collision=1
2. Verify ground tile 1,2,6 (walkable) have collision=0
3. Exception: doors have ground=4 but collision=0

**Diagnostic script:**
```javascript
// Find mismatches between ground and collision
for (let i = 0; i < 4096; i++) {
  const ground = groundData[i];
  const collision = collisionData[i];
  const x = i % 64, y = Math.floor(i / 64);
  
  // Building should be blocked (except doors)
  if (ground === 4 && collision === 0) {
    console.log(`Possible door at (${x}, ${y})`);
  }
  // Grass/road should be passable
  if ((ground === 1 || ground === 2) && collision === 1) {
    console.log(`ERROR: Walkable tile blocked at (${x}, ${y})`);
  }
}
```

### Door not working

**Symptom**: Cannot enter building through door

**Fix**:
1. Verify door tiles have collision=0
2. Check door is on building edge (adjacent to road/grass)
3. Verify ground layer shows building (tile 4) at door position

## Related Documentation

- [Grid-Town Map Spec](./map_spec_grid_town.md) - Zone layout, facilities, and current map specification
- [Demo Runbook](../demo-runbook.md) - Testing procedures
