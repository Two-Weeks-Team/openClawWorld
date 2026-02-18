# Kenney Asset Analysis Report

**Generated:** 2026-02-18
**Purpose:** Comprehensive asset inventory for openClawWorld zone requirements

## Overview

Analyzed 5 Kenney asset packs to identify all assets needed for the 8 game zones.

| Pack Name | Tile Count | Primary Use |
|-----------|------------|-------------|
| **Roguelike City Pack** | 1,040 | City exterior, roads, buildings |
| **RPG Urban Pack** | 582 | Modern city, signs |
| **Roguelike Interior Pack** | ~300 | Indoor furniture, cafe |
| **Roguelike Characters Pack** | ~100 | NPCs, players |
| **Isometric Space Interior** | ~200 | SF office, computers |

---

## 1. Tileset Assets (Floor/Road/Wall)

### Floor Tiles
**Source: Roguelike City Pack** (`tilemap_packed.png`)

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Lobby floor** | (0~3, 8~11) | Light gray |
| **Office floor** | (0~3, 4~7) | Dark gray |
| **Cafe floor** | (0~3, 12~15) | Wooden/tan |
| **Arcade floor** | (18~20, 15~18) | Checkered |
| **Park grass** | (25~27, 0~7) | Grass with dirt borders |
| **Plaza pavement** | (21~24, 6~8) | Stone blocks |

### Road Tiles
**Source: Roguelike City Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Asphalt base** | (21, 9) | Solid color |
| **Straight road (vertical)** | (21~22, 11) | With lane markings |
| **Straight road (horizontal)** | (21, 13~14) | With lane markings |
| **Corner** | (23~24, 11~12) | 4 variants |
| **Intersection** | (22~23, 13~14) | T-junction/cross |
| **Crosswalk** | (22~23, 9~10) | Striped |
| **Sidewalk (gray)** | (21~24, 0~2) | Pedestrian path |
| **Sidewalk (tan)** | (21~24, 3~5) | Pedestrian path |

### Wall Tiles
**Source: Roguelike City Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Red brick** | (4~8, 0~3) | Top/middle/bottom |
| **Gray stone** | (4~8, 4~7) | Top/middle/bottom |
| **Modern glass** | (4~11, 16~22) | Building exterior |
| **Indoor wall** | (15~17, 20~23) | Thin partition |
| **Wood fence** | (15~17, 19) | Park use |

### Water/Lake Tiles
**Source: Roguelike City Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Water center** | (5, 27) | Fountain/lake |
| **Water border** | (4, 27), (6, 27), (5, 26), (5, 28) | Top/bottom/left/right |
| **Water corner** | (4, 26), (4, 28), (6, 26), (6, 28) | Corners |

### Door Tiles
**Source: Roguelike City Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Glass automatic door** | (24~26, 23~25) | Open/closed |
| **Wood door (closed)** | (27, 20/22/24/26/28) | 5 variants |
| **Wood door (open)** | (27, 21/23/25/27/29) | 5 variants |

---

## 2. Furniture Assets

### Tables/Desks
**Source: Roguelike Interior Pack** (`roguelikeIndoor_transparent.png`)

| Purpose | Coordinates (row, col) | Size |
|---------|------------------------|------|
| **Large wood table** | (0~1, 0~3) | 4x2 |
| **Oval table** | (0~1, 4~7) | 4x2 |
| **Round table** | (0~3, 8) | 1x1 each color |
| **Orange meeting table** | (7~9, 4~7) | 4x3 |
| **Green meeting table** | (7~9, 8~11) | 4x3 |
| **Large orange** | (10~11, 18~21) | 4x2 |
| **Large green** | (12~13, 18~21) | 4x2 |

### Chairs
**Source: Roguelike Interior Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Wood chair (multi-direction)** | (2~6, 0~3) | Front/side/back |
| **Gray chair** | (7~9, 0~3) | Office style |
| **Stool** | (10~13, 26) | No backrest |

### Sofas/Beds
**Source: Roguelike Interior Pack**

| Purpose | Coordinates (row, col) | Size |
|---------|------------------------|------|
| **1-person orange** | (0~1, 9~10) | 2x2 |
| **1-person green** | (2~3, 9~10) | 2x2 |
| **Large orange** | (0~1, 14~17) | 4x2 |
| **Large green** | (2~3, 14~17) | 4x2 |

### Storage/Shelves
**Source: Roguelike Interior Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Drawer/nightstand** | (2~4, 4~7) | Small size |
| **Wall bookshelf** | (10~18, 0~11) | Large area |
| **Vertical bookshelf** | (14~18, 25~26) | Narrow/tall |

### Counter/Bar
**Source: Roguelike Interior Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Kitchen/bar counter** | (10~18, 12~13) | Long form |
| **Sink counter** | (10~11, 14~15) | 2x2 |

---

## 3. Facility Assets (Modern Equipment)

### Computers/Electronics
**Source: Isometric Space Interior** (RECOMMENDED)

| Purpose | Description | Notes |
|---------|-------------|-------|
| **Desktop terminal** | Small monitor + tower | Place on desk |
| **Wall display** | Various size screens | For meeting room |
| **Control console** | Angled screen + buttons | For info kiosk |
| **Server rack** | Large data server | IT room |
| **SF chair** | Ergonomic design | Office use |

### Arcade/Vending
**Source: RPG Urban Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Vending machine** | (10~12, 10~12) | Drinks/snacks |
| **Bulletin/whiteboard** | (12, 11) | Meeting room |
| **Street lamp** | (8, 0~3) | Outdoor lighting |
| **Road sign** | (8, 4~7) | Direction |
| **Traffic light** | (17, 3~6) | Intersection |

---

## 4. Decoration Assets

### Outdoor Decorations
**Source: Roguelike City Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Street lamp** | (11~12, 1~5) | Wall/standalone |
| **Wood bench** | (11~12, 11~12) | Park use |
| **Statue** | (2, 19~20) | Fountain decoration |
| **Fountain** | (3, 17~18) | Plaza use |
| **Cone tree** | (7, 17~20) | Green/orange |
| **Round tree** | (8, 17~20) | Green/orange |
| **Tall tree** | (9, 17~20) | Park use |
| **Bush** | (10, 17~20) | Small shrub |
| **Potted plant** | (1, 17~18) | Indoor/outdoor |
| **Long planter** | (4~5, 17~20) | Building front |
| **Trash can** | (11, 8~9) | Blue/gray |
| **Mailbox** | (12, 8~9) | Red/blue |
| **Fire hydrant** | (11, 13) | Red |
| **Manhole cover** | (17, 6) | Road use |

### Signs
**Source: Roguelike City Pack**

| Purpose | Coordinates (row, col) | Description |
|---------|------------------------|-------------|
| **Stand sign** | (11~12, 6~7) | Info |
| **Floor symbol (P)** | (17, 8~10) | Parking |
| **Arrow** | (18, 8~10) | Direction |

### Vehicles
**Source: Roguelike City Pack**

| Purpose | Coordinates (row, col) | Color |
|---------|------------------------|-------|
| **Green car** | (13~14, 17~18) | Top-down |
| **Gray car** | (15~16, 17~18) | Top-down |
| **Orange car** | (17~18, 17~18) | Top-down |
| **Food cart** | (11~12, 17~20) | Hot dog etc |

---

## 5. Character Assets

### Base Characters (Player)
**Source: Roguelike Characters Pack** (17x17 grid with 1px spacing)

| Role | Coordinates (row, col) | Appearance |
|------|------------------------|------------|
| **Basic human (light skin)** | (0, 0) | Standard |
| **Basic human (medium skin)** | (1, 0) | Diverse |
| **Basic human (dark skin)** | (2, 0) | Diverse |
| **White-haired elder** | (5, 0) | Sage/mentor |
| **Brown-haired youth** | (6, 0) | Standard hero |
| **Hooded figure** | (7, 0) | Mystery |
| **Headband warrior** | (8, 0) | Action |

### NPC Role Combinations
**Source: Roguelike Characters Pack**

| NPC Role | Base | Outfit Coords | Hair Coords |
|----------|------|---------------|-------------|
| **Greeter** | (1, 0) | (0, 6) purple uniform | (11, 12) blonde |
| **Security** | (10, 0) | Built-in helmet | - |
| **Office-PM** | (1, 0) | (0, 3) brown suit | (11, 11) brown |
| **IT-Help** | (0, 0) | (0, 5) blue shirt | (1, 1) glasses |
| **Meeting-Host** | (5, 0) | (3, 2) robe | Built-in white |
| **Barista** | (0, 0) | (0, 2) orange tunic | Choice |
| **Arcade-Host** | (8, 0) | (0, 4) teal | Built-in headband |
| **Ranger** | (6, 0) | (1, 2) green | (11, 13) |
| **Fountain-Keeper** | (1, 0) | (2, 2) workwear | Choice |

### Customization Elements
**Source: Roguelike Characters Pack**

| Part | Coordinate Area | Variants |
|------|-----------------|----------|
| **Hair** | (0~10, 11~14) | 4 colors, various styles |
| **Clothes** | (0~10, 2~10) | Tunics, robes, armor |
| **Weapons** | (0~10, 24~32) | Swords, axes, bows, staffs |
| **Shields** | (0~10, 18~23) | Wood, iron, decorated |
| **Faces** | (0~10, 1) | Glasses, expressions |

---

## 6. Zone Asset Mapping

| Zone | Floor | Wall | Furniture | Facilities | NPC |
|------|-------|------|-----------|------------|-----|
| **Lobby** | (0~3, 8~11) | (4~8, 4~7) | Counter | Info display | greeter, security |
| **Office** | (0~3, 4~7) | (15~17, 20~23) | Desk, chair | Computer, whiteboard | pm, it-help |
| **CentralPark** | (25~27, 0~7) | - | Bench | Sign, lamp | ranger |
| **Arcade** | (18~20, 15~18) | (4~8, 0~3) | Table | Game cabinet, vending | arcade-host |
| **Meeting** | (0~3, 8~11) | (15~17, 20~23) | Meeting table | Whiteboard, screen | meeting-host |
| **LoungeCafe** | (0~3, 12~15) | (4~8, 0~3) | Sofa, table | Coffee machine, counter | barista |
| **Plaza** | (21~24, 6~8) | - | Bench | Fountain, lamp | fountain-keeper |
| **Lake** | (5, 27) water | - | - | - | - |

---

## 7. Gap Analysis

### Missing Assets (Critical)

| Asset | Purpose | Recommended Source |
|-------|---------|-------------------|
| **Computer/Monitor** | Office | Isometric Space Interior |
| **Arcade game cabinet** | Arcade | NOT AVAILABLE - custom needed |
| **Coffee machine** | Cafe | NOT AVAILABLE - use vending |
| **Kanban board** | Office | Use whiteboard substitute |

### Replaceable Assets

| Asset | Purpose | Substitute |
|-------|---------|------------|
| **Projector** | Meeting | Wall display |
| **Kiosk** | Info | Control console |

---

## 8. Manifest JSON Template

```json
{
  "version": "1.0.0",
  "generated": "2026-02-18",
  "sources": {
    "city": "Roguelike City Pack/Tilemap/tilemap_packed.png",
    "interior": "Roguelike Interior Pack/Tilesheets/roguelikeIndoor_transparent.png",
    "urban": "RPG Urban Pack/Tilemap/tilemap_packed.png",
    "characters": "Roguelike Characters Pack/Spritesheet/roguelikeChar_transparent.png"
  },
  "tileset": {
    "tiles": {
      "grass_light": {"source": "city", "row": 25, "col": 0},
      "grass_dark": {"source": "city", "row": 26, "col": 0},
      "road_straight_v": {"source": "city", "row": 21, "col": 11},
      "road_straight_h": {"source": "city", "row": 21, "col": 13},
      "road_corner_tl": {"source": "city", "row": 23, "col": 11},
      "road_corner_tr": {"source": "city", "row": 23, "col": 12},
      "road_corner_bl": {"source": "city", "row": 24, "col": 11},
      "road_corner_br": {"source": "city", "row": 24, "col": 12},
      "road_crossroad": {"source": "city", "row": 22, "col": 13},
      "water_center": {"source": "city", "row": 5, "col": 27},
      "water_top": {"source": "city", "row": 4, "col": 27},
      "water_bottom": {"source": "city", "row": 6, "col": 27},
      "water_left": {"source": "city", "row": 5, "col": 26},
      "water_right": {"source": "city", "row": 5, "col": 28},
      "wall_brick": {"source": "city", "row": 5, "col": 1},
      "wall_stone": {"source": "city", "row": 5, "col": 5},
      "door_wood_closed": {"source": "city", "row": 27, "col": 20},
      "door_wood_open": {"source": "city", "row": 27, "col": 21},
      "door_glass": {"source": "city", "row": 25, "col": 24},
      "floor_lobby": {"source": "city", "row": 1, "col": 9},
      "floor_office": {"source": "city", "row": 1, "col": 5},
      "floor_cafe": {"source": "city", "row": 1, "col": 13},
      "floor_arcade": {"source": "city", "row": 19, "col": 16}
    }
  },
  "furniture": {
    "items": {
      "table_large": {"source": "interior", "row": 0, "col": 0, "width": 4, "height": 2},
      "table_round": {"source": "interior", "row": 0, "col": 8, "width": 1, "height": 1},
      "chair_front": {"source": "interior", "row": 2, "col": 0},
      "chair_left": {"source": "interior", "row": 2, "col": 1},
      "chair_right": {"source": "interior", "row": 2, "col": 2},
      "chair_back": {"source": "interior", "row": 2, "col": 3},
      "sofa_orange": {"source": "interior", "row": 0, "col": 9, "width": 2, "height": 2},
      "sofa_green": {"source": "interior", "row": 2, "col": 9, "width": 2, "height": 2},
      "counter_bar": {"source": "interior", "row": 10, "col": 12, "width": 2, "height": 9},
      "bookshelf": {"source": "interior", "row": 10, "col": 0, "width": 12, "height": 9}
    }
  },
  "decorations": {
    "items": {
      "tree_round_green": {"source": "city", "row": 8, "col": 17},
      "tree_round_orange": {"source": "city", "row": 8, "col": 18},
      "tree_cone_green": {"source": "city", "row": 7, "col": 17},
      "tree_cone_orange": {"source": "city", "row": 7, "col": 18},
      "tree_tall": {"source": "city", "row": 9, "col": 17},
      "bush": {"source": "city", "row": 10, "col": 17},
      "bench": {"source": "city", "row": 11, "col": 11},
      "fountain": {"source": "city", "row": 3, "col": 17},
      "statue": {"source": "city", "row": 2, "col": 19},
      "streetlamp_single": {"source": "city", "row": 11, "col": 1},
      "streetlamp_double": {"source": "city", "row": 11, "col": 2},
      "trash_can_blue": {"source": "city", "row": 11, "col": 8},
      "trash_can_gray": {"source": "city", "row": 11, "col": 9},
      "fire_hydrant": {"source": "city", "row": 11, "col": 13},
      "potted_plant": {"source": "city", "row": 1, "col": 17}
    }
  },
  "characters": {
    "npcs": {
      "greeter": {"base": [1, 0], "outfit": [0, 6], "hair": [11, 12]},
      "security": {"base": [10, 0]},
      "office-pm": {"base": [1, 0], "outfit": [0, 3], "hair": [11, 11]},
      "it-help": {"base": [0, 0], "outfit": [0, 5], "face": [1, 1]},
      "meeting-host": {"base": [5, 0], "outfit": [3, 2]},
      "barista": {"base": [0, 0], "outfit": [0, 2]},
      "arcade-host": {"base": [8, 0], "outfit": [0, 4]},
      "ranger": {"base": [6, 0], "outfit": [1, 2], "hair": [11, 13]},
      "fountain-keeper": {"base": [1, 0], "outfit": [2, 2]}
    },
    "players": {
      "human_light": {"base": [0, 0]},
      "human_medium": {"base": [1, 0]},
      "human_dark": {"base": [2, 0]},
      "agent": {"base": [7, 0]}
    }
  }
}
```

---

## 9. Next Steps

1. **Create `kenney-curation.json`** - Use the manifest template above
2. **Update extraction scripts** - Modify `extract_tileset.py`, `extract_npc_sprites.py`, `extract_player_sprites.py`
3. **Integrate Isometric Space Interior** - For modern office equipment
4. **Create custom sprites** - Arcade game cabinet (not available in Kenney)

---

## References

- **Kenney Asset Pack**: [kenney.nl](https://kenney.nl)
- **License**: CC0 (Public Domain)
- **Tile Size**: 16x16 pixels (native)
- **Character Grid**: 17x17 pixels (16px + 1px margin)
