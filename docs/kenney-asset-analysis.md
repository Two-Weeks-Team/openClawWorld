# Kenney Asset Analysis

- Date: 2026-02-13
- Scope: curated Kenney assets used by openClawWorld map/sprite pipelines
- Primary source root (repo-tracked): `packages/client/public/assets/kenney`

## Section 1: Tileset Assets

Reference tiles (Roguelike City Pack, coordinates are `(row, col)`):

| Tile | Coordinate (row, col) | Notes |
|---|---|---|
| grass_light | (25, 0) | outdoor grass base |
| road_straight_v | (21, 11) | main road segment |
| water_center | (5, 27) | lake/water body |
| wall_brick | (5, 1) | wall/block visual |
| door_wood_closed | (27, 20) | door marker |

## Section 2: Interior Assets

Tracked interior source:

- Pack: `Roguelike Interior Pack`
- File: `packages/client/public/assets/kenney/interior/interior_tilemap.png`
- Grid: 16x16 tiles with 1px spacing

## Section 3: Object Assets

Current object extraction source contract:

- City objects: extracted from `packages/client/public/assets/kenney/tiles/city_tilemap.png`
- Interior objects: extracted from `packages/client/public/assets/kenney/interior/interior_tilemap.png`

## Section 4: Zone Tile Usage Summary

This table is a quick semantic reference for zone visuals.

| Zone | Dominant visual hint |
|---|---|
| Lobby | bright neutral floor |
| Office | dark neutral floor |
| CentralPark | grass |
| Arcade | patterned floor |
| Meeting | bright neutral floor |
| LoungeCafe | wood floor |
| Plaza | block/pavement |
| Lake | water |

## Section 5: Character Assets

### NPC coordinates (Roguelike Characters Pack, 17x17 grid)

| NPC | Base | Outfit | Hair |
|---|---|---|---|
| greeter | (1, 0) | (0, 6) | (11, 12) |
| security | (10, 0) | - | - |
| barista | (0, 0) | (0, 2) | - |
| ranger | (6, 0) | (1, 2) | (11, 13) |
| office-pm | (1, 0) | (0, 3) | (11, 11) |
| it-help | (0, 0) | (0, 5) | (1, 1) glasses |
| meeting-host | (5, 0) | (3, 2) | - |
| arcade-host | (8, 0) | (0, 4) | - |
| fountain-keeper | (1, 0) | (2, 2) | - |

### Player base coordinates (Roguelike Characters Pack, 17x17 grid)

| Type | Coordinate (row, col) | Notes |
|---|---|---|
| human_light | (0, 0) | default human |
| human_medium | (1, 0) | medium skin tone |
| human_dark | (2, 0) | dark skin tone |
| agent (hooded) | (7, 0) | AI agent visual |

Customization coordinate ranges:

| Part | Coordinate range |
|---|---|
| Hair | (0~10, 11~14) |
| Clothes | (0~10, 2~10) |
| Faces | (0~10, 1) |

## Section 6: Zone Asset Mapping

Minimap-oriented zone tile hints (coordinates in `(row, col)`):

| Zone | Floor tile coordinate | Notes |
|---|---|---|
| Lobby | (0~3, 8~11) | bright gray |
| Office | (0~3, 4~7) | dark gray |
| CentralPark | (25~27, 0~7) | grass |
| Arcade | (18~20, 15~18) | check pattern |
| Meeting | (0~3, 8~11) | bright gray |
| LoungeCafe | (0~3, 12~15) | wood floor |
| Plaza | (21~24, 6~8) | pavement |
| Lake | (5, 27) | water |

## Section 7: Validation Notes

- Use `python3 tools/extract_tileset.py` to regenerate `tileset.png` and `tileset.json` from manifest.
- Use `node scripts/verify-map-stack-consistency.mjs` to validate map/tileset/manifest consistency.

## Section 8: Manifest JSON Template

Primary manifest file:

- `tools/kenney-curation.json`

Contract highlights:

- `sourceRoot`: repository-tracked Kenney subset root
- `packs`: per-source path, tile size, spacing
- `tileset.slots`: fixed 32-slot contract (`slot`, `semantic`, `source.pack`, `source.col`, `source.row`)

