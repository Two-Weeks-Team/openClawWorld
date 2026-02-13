#!/usr/bin/env python3
"""Extract map tileset using the Kenney curation manifest contract."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ModuleNotFoundError:
    Image = None


REPO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = Path(__file__).resolve().with_name("kenney-curation.json")


class CurationError(RuntimeError):
    """Raised when kenney-curation.json contract is invalid."""


def _require_int(value: Any, field: str, *, minimum: int = 0) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise CurationError(f"{field} must be an integer, got {value!r}")
    if value < minimum:
        raise CurationError(f"{field} must be >= {minimum}, got {value}")
    return value


def _require_str(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value:
        raise CurationError(f"{field} must be a non-empty string")
    return value


def _resolve_repo_path(relative_path: str, field: str) -> Path:
    path = REPO_ROOT / relative_path
    if not path.exists():
        raise CurationError(f"{field} does not exist: {path}")
    return path


def _load_manifest() -> dict[str, Any]:
    if not MANIFEST_PATH.exists():
        raise CurationError(f"Manifest not found: {MANIFEST_PATH}")

    with MANIFEST_PATH.open("r", encoding="utf-8") as f:
        try:
            manifest = json.load(f)
        except json.JSONDecodeError as exc:
            raise CurationError(f"Failed to parse {MANIFEST_PATH}: {exc}") from exc

    if not isinstance(manifest, dict):
        raise CurationError("Manifest root must be an object")
    return manifest


def _load_pack_images(manifest: dict[str, Any], tile_size: int) -> dict[str, dict[str, Any]]:
    source_root_rel = _require_str(manifest.get("sourceRoot"), "sourceRoot")
    source_root = _resolve_repo_path(source_root_rel, "sourceRoot")
    if not source_root.is_dir():
        raise CurationError(f"sourceRoot must be a directory: {source_root}")

    packs = manifest.get("packs")
    if not isinstance(packs, dict) or not packs:
        raise CurationError("packs must be a non-empty object")

    pack_images: dict[str, dict[str, Any]] = {}
    for pack_name, pack in packs.items():
        if not isinstance(pack, dict):
            raise CurationError(f"packs.{pack_name} must be an object")

        pack_path_rel = _require_str(pack.get("path"), f"packs.{pack_name}.path")
        pack_path = source_root / pack_path_rel
        if not pack_path.exists():
            raise CurationError(f"packs.{pack_name}.path does not exist: {pack_path}")

        pack_tile_size = _require_int(pack.get("tileSize", tile_size), f"packs.{pack_name}.tileSize", minimum=1)
        if pack_tile_size != tile_size:
            raise CurationError(
                f"packs.{pack_name}.tileSize={pack_tile_size} must match tileset.tileSize={tile_size}"
            )
        spacing = _require_int(pack.get("spacing", 0), f"packs.{pack_name}.spacing", minimum=0)

        pack_images[pack_name] = {
            "image": Image.open(pack_path),
            "spacing": spacing,
            "path": pack_path,
        }

    return pack_images


def _extract_tile(pack_img: Image.Image, tile_size: int, spacing: int, col: int, row: int) -> Image.Image:
    x = col * (tile_size + spacing)
    y = row * (tile_size + spacing)
    if x + tile_size > pack_img.width or y + tile_size > pack_img.height:
        raise CurationError(
            f"Tile out of bounds: col={col}, row={row}, tile_size={tile_size}, spacing={spacing}, "
            f"image_size={pack_img.width}x{pack_img.height}"
        )
    return pack_img.crop((x, y, x + tile_size, y + tile_size))


def _build_output_meta(
    *,
    tile_size: int,
    columns: int,
    rows: int,
    image_name: str,
) -> dict[str, Any]:
    return {
        "name": "tileset",
        "tilewidth": tile_size,
        "tileheight": tile_size,
        "tilecount": columns * rows,
        "columns": columns,
        "image": image_name,
        "imagewidth": columns * tile_size,
        "imageheight": rows * tile_size,
    }


def main() -> int:
    if Image is None:
        raise CurationError("Pillow is required. Install it with: python3 -m pip install pillow")

    manifest = _load_manifest()

    tileset = manifest.get("tileset")
    if not isinstance(tileset, dict):
        raise CurationError("tileset must be an object")

    tile_size = _require_int(tileset.get("tileSize"), "tileset.tileSize", minimum=1)
    columns = _require_int(tileset.get("columns"), "tileset.columns", minimum=1)
    rows = _require_int(tileset.get("rows"), "tileset.rows", minimum=1)
    expected_slots = columns * rows

    output_png_rel = _require_str(tileset.get("outputPng"), "tileset.outputPng")
    output_meta_rel = _require_str(tileset.get("outputMeta"), "tileset.outputMeta")
    output_png = REPO_ROOT / output_png_rel
    output_meta = REPO_ROOT / output_meta_rel

    slots = tileset.get("slots")
    if not isinstance(slots, list):
        raise CurationError("tileset.slots must be an array")
    if len(slots) != expected_slots:
        raise CurationError(
            f"tileset.slots must contain exactly {expected_slots} entries, got {len(slots)}"
        )

    pack_images = _load_pack_images(manifest, tile_size)

    sorted_slots: list[dict[str, Any]] = []
    seen_slots: set[int] = set()
    for index, slot in enumerate(slots):
        slot_field = f"tileset.slots[{index}]"
        if not isinstance(slot, dict):
            raise CurationError(f"{slot_field} must be an object")

        slot_index = _require_int(slot.get("slot"), f"{slot_field}.slot", minimum=0)
        if slot_index >= expected_slots:
            raise CurationError(
                f"{slot_field}.slot={slot_index} is out of range (0..{expected_slots - 1})"
            )
        if slot_index in seen_slots:
            raise CurationError(f"Duplicate slot index: {slot_index}")
        seen_slots.add(slot_index)

        source = slot.get("source")
        if not isinstance(source, dict):
            raise CurationError(f"{slot_field}.source must be an object")

        pack_name = _require_str(source.get("pack"), f"{slot_field}.source.pack")
        if pack_name not in pack_images:
            raise CurationError(f"{slot_field}.source.pack references unknown pack: {pack_name}")

        col = _require_int(source.get("col"), f"{slot_field}.source.col", minimum=0)
        row = _require_int(source.get("row"), f"{slot_field}.source.row", minimum=0)
        semantic = _require_str(slot.get("semantic"), f"{slot_field}.semantic")

        sorted_slots.append(
            {
                "slot": slot_index,
                "semantic": semantic,
                "pack": pack_name,
                "col": col,
                "row": row,
            }
        )

    if len(seen_slots) != expected_slots:
        missing = sorted(set(range(expected_slots)) - seen_slots)
        raise CurationError(f"Missing slot definitions: {missing}")

    sorted_slots.sort(key=lambda item: item["slot"])

    output_width = columns * tile_size
    output_height = rows * tile_size
    tileset_img = Image.new("RGBA", (output_width, output_height), (0, 0, 0, 0))

    for slot in sorted_slots:
        slot_index = slot["slot"]
        pack_cfg = pack_images[slot["pack"]]
        tile = _extract_tile(
            pack_img=pack_cfg["image"],
            tile_size=tile_size,
            spacing=pack_cfg["spacing"],
            col=slot["col"],
            row=slot["row"],
        )

        out_col = slot_index % columns
        out_row = slot_index // columns
        out_x = out_col * tile_size
        out_y = out_row * tile_size
        tileset_img.paste(tile, (out_x, out_y))

        print(
            f"slot={slot_index:02d} semantic={slot['semantic']} "
            f"source={slot['pack']}({slot['col']},{slot['row']}) output=({out_col},{out_row})"
        )

    os.makedirs(output_png.parent, exist_ok=True)
    tileset_img.save(output_png)

    output_meta_json = _build_output_meta(
        tile_size=tile_size,
        columns=columns,
        rows=rows,
        image_name=output_png.name,
    )

    os.makedirs(output_meta.parent, exist_ok=True)
    with output_meta.open("w", encoding="utf-8") as f:
        json.dump(output_meta_json, f, indent=2)
        f.write("\n")

    print(f"\nSaved tileset image: {output_png}")
    print(f"Saved tileset metadata: {output_meta}")
    print(f"Output size: {output_width}x{output_height}")
    print("Manifest contract applied successfully.")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CurationError as exc:
        print(f"[ERROR] {exc}")
        raise SystemExit(1)
