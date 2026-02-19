#!/usr/bin/env python3
"""
Compare tiles between project tileset and Kenney source tilemaps.

Computes perceptual hashes for each tile in both images, then finds the best
matches by hamming distance. Useful for:
- Reverse-tracking which Kenney tile was used at each slot
- Verifying extraction accuracy
- Finding alternative tiles with similar appearance

Usage:
    python tools/compare_tiles.py \
        --current packages/client/public/assets/maps/tileset.png \
        --reference packages/client/public/assets/kenney/tiles/city_tilemap.png \
        --current-tile-size 16 --current-cols 8 \
        --ref-tile-size 16 --ref-spacing 0 \
        --threshold 5
"""

import argparse
import json
import os
import sys
from typing import Any, Dict, List, Tuple

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

try:
    import imagehash
except ImportError:
    print("Error: imagehash is required. Install with: pip install imagehash")
    sys.exit(1)


def extract_tiles_from_grid(
    image_path: str,
    tile_size: int = 16,
    spacing: int = 0,
    cols: int = 0,
    rows: int = 0,
) -> List[Dict[str, Any]]:
    """Extract all tiles from a grid-based tileset and compute their pHashes."""
    img = Image.open(image_path).convert("RGBA")
    width, height = img.size

    step = tile_size + spacing
    if cols == 0:
        cols = (width + spacing) // step if spacing > 0 else width // tile_size
    if rows == 0:
        rows = (height + spacing) // step if spacing > 0 else height // tile_size

    tiles = []
    for row in range(rows):
        for col in range(cols):
            x = col * step
            y = row * step
            tile_img = img.crop((x, y, x + tile_size, y + tile_size))

            # Check if blank
            pixels = list(tile_img.getdata())
            transparent_count = sum(1 for p in pixels if len(p) >= 4 and p[3] < 10)
            is_blank = (transparent_count / max(len(pixels), 1)) > 0.95

            if is_blank:
                continue

            phash = imagehash.phash(tile_img)
            tiles.append({
                "col": col,
                "row": row,
                "index": row * cols + col,
                "phash": phash,
                "phash_str": str(phash),
                "image": tile_img,
            })

    return tiles


def compare_tilesets(
    current_tiles: List[Dict[str, Any]],
    reference_tiles: List[Dict[str, Any]],
    threshold: int = 5,
    top_n: int = 3,
) -> List[Dict[str, Any]]:
    """
    Compare current tiles against reference tiles and find best matches.

    Args:
        current_tiles: Tiles from the project tileset
        reference_tiles: Tiles from the Kenney source
        threshold: Max hamming distance for a "match"
        top_n: Number of top matches to report per tile

    Returns:
        List of match results for each current tile
    """
    results = []

    for ct in current_tiles:
        matches = []
        for rt in reference_tiles:
            dist = ct["phash"] - rt["phash"]
            if dist <= threshold:
                matches.append({
                    "ref_col": rt["col"],
                    "ref_row": rt["row"],
                    "ref_index": rt["index"],
                    "distance": dist,
                    "confidence": max(0, 100 - dist * 10),
                })

        # Sort by distance (best match first)
        matches.sort(key=lambda m: m["distance"])
        matches = matches[:top_n]

        result = {
            "current_col": ct["col"],
            "current_row": ct["row"],
            "current_index": ct["index"],
            "phash": ct["phash_str"],
            "matches": matches,
            "best_match": matches[0] if matches else None,
            "exact_match": matches[0]["distance"] == 0 if matches else False,
        }
        results.append(result)

    return results


def print_comparison_report(
    results: List[Dict[str, Any]],
    current_path: str,
    reference_path: str,
) -> None:
    """Print a human-readable comparison report."""
    print(f"\n{'=' * 70}")
    print(f"TILE COMPARISON REPORT")
    print(f"{'=' * 70}")
    print(f"Current:   {current_path}")
    print(f"Reference: {reference_path}")
    print(f"{'=' * 70}\n")

    exact = sum(1 for r in results if r["exact_match"])
    matched = sum(1 for r in results if r["best_match"] is not None)
    unmatched = len(results) - matched

    print(f"Total tiles compared: {len(results)}")
    print(f"Exact matches:        {exact}")
    print(f"Close matches:        {matched - exact}")
    print(f"No match found:       {unmatched}")
    print()

    for r in results:
        idx = r["current_index"]
        col = r["current_col"]
        row = r["current_row"]

        if r["exact_match"]:
            bm = r["best_match"]
            status = "EXACT"
            detail = f"ref({bm['ref_col']},{bm['ref_row']}) dist=0 conf=100%"
        elif r["best_match"]:
            bm = r["best_match"]
            status = "CLOSE"
            detail = f"ref({bm['ref_col']},{bm['ref_row']}) dist={bm['distance']} conf={bm['confidence']}%"
        else:
            status = "NONE "
            detail = "no match within threshold"

        print(f"  [{idx:3d}] ({col:2d},{row:2d}) [{status}] {detail}")

        # Show additional matches if close
        if r["best_match"] and len(r["matches"]) > 1:
            for alt in r["matches"][1:]:
                print(
                    f"         also: ref({alt['ref_col']},{alt['ref_row']}) "
                    f"dist={alt['distance']} conf={alt['confidence']}%"
                )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare project tileset against Kenney source tilemaps."
    )
    parser.add_argument(
        "--current", "-c",
        required=True,
        help="Path to current project tileset PNG",
    )
    parser.add_argument(
        "--reference", "-r",
        required=True,
        help="Path to Kenney source tilemap PNG",
    )
    parser.add_argument(
        "--current-tile-size",
        type=int,
        default=16,
        help="Tile size for current tileset (default: 16)",
    )
    parser.add_argument(
        "--current-cols",
        type=int,
        default=0,
        help="Columns in current tileset (0 = auto-detect)",
    )
    parser.add_argument(
        "--current-spacing",
        type=int,
        default=0,
        help="Spacing in current tileset (default: 0)",
    )
    parser.add_argument(
        "--ref-tile-size",
        type=int,
        default=16,
        help="Tile size for reference tilemap (default: 16)",
    )
    parser.add_argument(
        "--ref-spacing",
        type=int,
        default=0,
        help="Spacing in reference tilemap (default: 0)",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=5,
        help="Max hamming distance for match detection (default: 5)",
    )
    parser.add_argument(
        "--output", "-o",
        help="Save comparison results as JSON to this path",
    )

    args = parser.parse_args()

    for path in [args.current, args.reference]:
        if not os.path.exists(path):
            print(f"Error: File not found: {path}")
            sys.exit(1)

    print("Extracting current tileset tiles...")
    current_tiles = extract_tiles_from_grid(
        args.current,
        tile_size=args.current_tile_size,
        spacing=args.current_spacing,
        cols=args.current_cols,
    )
    print(f"  Found {len(current_tiles)} non-blank tiles")

    print("Extracting reference tilemap tiles...")
    reference_tiles = extract_tiles_from_grid(
        args.reference,
        tile_size=args.ref_tile_size,
        spacing=args.ref_spacing,
    )
    print(f"  Found {len(reference_tiles)} non-blank tiles")

    print("Comparing tiles...")
    results = compare_tilesets(current_tiles, reference_tiles, args.threshold)

    print_comparison_report(results, args.current, args.reference)

    if args.output:
        os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
        # Remove non-serializable image data
        serializable = []
        for r in results:
            entry = dict(r)
            serializable.append(entry)

        report = {
            "current": args.current,
            "reference": args.reference,
            "threshold": args.threshold,
            "summary": {
                "totalCompared": len(results),
                "exactMatches": sum(1 for r in results if r["exact_match"]),
                "closeMatches": sum(
                    1 for r in results
                    if r["best_match"] and not r["exact_match"]
                ),
                "noMatch": sum(1 for r in results if not r["best_match"]),
            },
            "results": serializable,
        }

        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"\nResults saved to {args.output}")


if __name__ == "__main__":
    main()
