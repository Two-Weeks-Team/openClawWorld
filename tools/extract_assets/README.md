# Asset Extraction Pipeline

Deterministic Python pipeline for extracting sprites from source sheets into Phaser 3 atlases.

## Quick Start

```bash
pnpm extract:assets
```

Or manually:

```bash
python tools/extract_assets/extract.py --all
```

## Requirements

- Python 3.8+
- Pillow: `pip install Pillow`

## Usage

```bash
# Extract all sheets
python tools/extract_assets/extract.py --all

# Extract single sheet
python tools/extract_assets/extract.py --sheet terrain

# Clean and regenerate
python tools/extract_assets/extract.py --all --clean

# Custom paths
python tools/extract_assets/extract.py --all \
  --config-dir tools/extract_assets/config \
  --src-dir assets/source \
  --out-dir assets/extracted \
  --public-out-dir packages/client/public/assets/extracted
```

## Output Structure

```
assets/extracted/{category}/
  packed.png      - Atlas image (power-of-2 dimensions)
  packed.json     - Phaser atlas JSON (TexturePacker format)
  manifest.json   - Source coordinates + aliases
  preview.png     - QA contact sheet

packages/client/public/assets/extracted/{category}/
  packed.png      - Copied for client runtime
  packed.json     - Copied for client runtime
```

## Source Sheets

| Sheet         | Grid  | Source Cell | Output Tile |
| ------------- | ----- | ----------- | ----------- |
| terrain       | 8x10  | 256x204     | 32x32       |
| props         | 10x10 | 204x204     | 32x32       |
| interactables | 8x8   | 256x256     | 32x32       |
| npc           | 8x8   | 256x256     | 32x32       |

## Config Reference

Each sheet config in `config/*.json`:

```json
{
  "sheetName": "terrain",
  "inputPath": "terrain.png",
  "outputTileSize": 32,
  "gridLine": { "enabled": true, "thickness": 2 },
  "mode": "grid",
  "grid": { "cols": 8, "rows": 10, "cellWidth": 256, "cellHeight": 204 },
  "excludeRects": [{ "x": 0, "y": 0, "w": 256, "h": 40, "reason": "label" }],
  "multiTile": [{ "name": "bridge", "startCol": 0, "startRow": 8, "cols": 4, "rows": 1 }],
  "blankDetector": { "enabled": true, "mode": "transparent", "threshold": 0.95 },
  "namingPrefix": "terrain",
  "aliases": { "grass_full": "terrain_0_0" }
}
```

## Adding New Assets

1. Add source PNG to `assets/source/`
2. Create config JSON in `tools/extract_assets/config/`
3. Run `pnpm extract:assets`
4. View in gallery: `http://localhost:5173/?scene=gallery`

## Gallery Scene

Access at `http://localhost:5173/?scene=gallery`

- Press 1-4 to switch atlases
- Hover sprites for frame names
- Scroll to zoom, drag to pan

## Determinism

Pipeline guarantees identical output for identical input:

- Sorted frame names
- Fixed packing order (row-major)
- Sorted JSON keys
- Fixed atlas sizing (power-of-2)
