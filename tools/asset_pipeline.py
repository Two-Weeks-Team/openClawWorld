#!/usr/bin/env python3
"""
Unified Kenney Asset Pipeline: Automated analysis → comparison → generation → verification.

Chains all asset tools into a single automated workflow with progress reporting
and comprehensive output. Designed for end-to-end asset integration.

Pipelines:
  analyze    - Deep analysis of a tileset/tilemap with all metrics
  compare    - Compare project tileset against Kenney source
  generate   - Generate missing tiles (transitions, autotile, variants)
  full       - Complete pipeline: analyze → compare → generate → verify
  palette    - Palette analysis, comparison, and normalization across packs
  report     - Generate comprehensive HTML/JSON report of all analysis

Usage:
    # Full pipeline for a new tileset pack
    python tools/asset_pipeline.py full \
        --source "path/to/kenney/tilemap_packed.png" \
        --project "packages/client/public/assets/maps/tileset.png" \
        --tile-size 16 --output-dir tools/analysis/city/

    # Palette compatibility check across all packs
    python tools/asset_pipeline.py palette \
        --tilemaps tile1.png tile2.png tile3.png \
        --output tools/analysis/palette_report.json

    # Quick analysis report
    python tools/asset_pipeline.py analyze \
        --input tilemap.png --tile-size 16 --deep
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install with: pip install Pillow")
    sys.exit(1)

# Import sibling tools
TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLS_DIR)

from analyze_tileset import analyze_tileset, generate_preview
from compare_tiles import extract_tiles_from_grid, compare_tilesets, print_comparison_report
from generate_tiles import (
    generate_dithered_transition_set,
    generate_autotile47_set,
    generate_palette_variants,
    extract_tilemap_palette,
    compare_palettes,
    extract_palette,
    save_palette_json,
    batch_resize_tilemap,
    resize_tile,
)


# =============================================================================
# Progress Reporter
# =============================================================================

class ProgressReporter:
    """Simple progress reporter for pipeline stages."""

    def __init__(self, total_stages: int):
        self.total = total_stages
        self.current = 0
        self.start_time = time.time()
        self.stage_times: List[Dict[str, Any]] = []

    def start_stage(self, name: str):
        self.current += 1
        self._stage_start = time.time()
        self._stage_name = name
        bar = self._bar()
        print(f"\n{'=' * 60}")
        print(f"  [{self.current}/{self.total}] {bar} {name}")
        print(f"{'=' * 60}")

    def end_stage(self, result_summary: str = ""):
        elapsed = time.time() - self._stage_start
        self.stage_times.append({
            "stage": self._stage_name,
            "elapsed": round(elapsed, 2),
        })
        print(f"  Done in {elapsed:.1f}s. {result_summary}")

    def finish(self):
        total_elapsed = time.time() - self.start_time
        print(f"\n{'=' * 60}")
        print(f"  Pipeline complete in {total_elapsed:.1f}s")
        print(f"{'=' * 60}")
        for st in self.stage_times:
            print(f"  {st['stage']}: {st['elapsed']}s")
        print()

    def _bar(self) -> str:
        filled = int(20 * self.current / self.total)
        return "[" + "#" * filled + "-" * (20 - filled) + "]"


# =============================================================================
# Pipeline: Analyze
# =============================================================================

def pipeline_analyze(
    input_path: str,
    tile_size: int,
    spacing: int,
    output_dir: str,
    deep: bool = True,
    name: Optional[str] = None,
) -> Dict[str, Any]:
    """Run deep analysis on a tileset and generate all outputs."""
    if name is None:
        name = Path(input_path).stem

    os.makedirs(output_dir, exist_ok=True)

    progress = ProgressReporter(3 if deep else 2)

    # Stage 1: Core analysis
    progress.start_stage("Core tileset analysis")
    analysis = analyze_tileset(
        image_path=input_path,
        tile_size=tile_size,
        spacing=spacing,
        deep_metrics=deep,
    )
    json_path = os.path.join(output_dir, f"{name}_analysis.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(analysis, f, indent=2)
    progress.end_stage(f"{analysis['nonBlankTiles']} non-blank tiles, {len(analysis['duplicates'])} duplicate groups")

    # Stage 2: Preview generation
    progress.start_stage("Preview generation")
    preview_path = os.path.join(output_dir, f"{name}_preview.png")
    generate_preview(input_path, analysis, preview_path, scale=3, show_connectivity=deep)
    progress.end_stage(f"Preview: {preview_path}")

    # Stage 3: Palette extraction (if deep)
    if deep:
        progress.start_stage("Palette extraction")
        pal_data = extract_tilemap_palette(input_path, tile_size, spacing)
        pal_json_path = os.path.join(output_dir, f"{name}_palette.json")
        with open(pal_json_path, "w") as f:
            json.dump(pal_data, f, indent=2, default=str)
        unique_colors = pal_data.get("stats", {}).get("uniqueColors", 0)
        progress.end_stage(f"{unique_colors} unique colors")

    progress.finish()

    return {
        "analysisPath": json_path,
        "previewPath": preview_path,
        "palettePath": pal_json_path if deep else None,
        "nonBlankTiles": analysis["nonBlankTiles"],
        "categories": list(analysis["categories"].keys()),
        "duplicateGroups": len(analysis["duplicates"]),
    }


# =============================================================================
# Pipeline: Compare
# =============================================================================

def pipeline_compare(
    project_path: str,
    source_path: str,
    project_tile_size: int,
    source_tile_size: int,
    source_spacing: int,
    output_dir: str,
    threshold: int = 5,
) -> Dict[str, Any]:
    """Compare project tileset against Kenney source."""
    os.makedirs(output_dir, exist_ok=True)

    progress = ProgressReporter(3)

    # Stage 1: Extract project tiles
    progress.start_stage("Extract project tiles")
    project_tiles = extract_tiles_from_grid(
        project_path, tile_size=project_tile_size,
    )
    progress.end_stage(f"{len(project_tiles)} non-blank tiles")

    # Stage 2: Extract source tiles
    progress.start_stage("Extract source tiles")
    source_tiles = extract_tiles_from_grid(
        source_path, tile_size=source_tile_size, spacing=source_spacing,
    )
    progress.end_stage(f"{len(source_tiles)} non-blank tiles")

    # Stage 3: Compare
    progress.start_stage("Compare tiles (pHash hamming distance)")
    results = compare_tilesets(project_tiles, source_tiles, threshold)
    print_comparison_report(results, project_path, source_path)

    # Save JSON
    report = {
        "current": project_path,
        "reference": source_path,
        "threshold": threshold,
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "totalCompared": len(results),
            "exactMatches": sum(1 for r in results if r["exact_match"]),
            "closeMatches": sum(1 for r in results if r["best_match"] and not r["exact_match"]),
            "noMatch": sum(1 for r in results if not r["best_match"]),
        },
        "results": results,
    }
    report_path = os.path.join(output_dir, "comparison_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    progress.end_stage(f"{report['summary']['exactMatches']} exact, {report['summary']['closeMatches']} close")

    progress.finish()
    return report


# =============================================================================
# Pipeline: Generate
# =============================================================================

def pipeline_generate(
    source_path: str,
    tile_size: int,
    spacing: int,
    output_dir: str,
    bg_tile_pos: Optional[tuple] = None,
    center_tile_pos: Optional[tuple] = None,
    generate_transitions: bool = True,
    generate_autotile: bool = True,
    generate_variants: bool = True,
    to_size: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Generate tiles from source tilemap.

    Args:
        bg_tile_pos: (col, row) of background tile in source
        center_tile_pos: (col, row) of center tile for autotiling
    """
    os.makedirs(output_dir, exist_ok=True)
    img = Image.open(source_path).convert("RGBA")
    step = tile_size + spacing

    generated = {"transitions": [], "autotile": {}, "variants": [], "resized": None}
    total_stages = sum([generate_transitions, generate_autotile, generate_variants, to_size is not None])
    progress = ProgressReporter(max(total_stages, 1))

    def get_tile(col, row):
        x, y = col * step, row * step
        return img.crop((x, y, x + tile_size, y + tile_size))

    bg_tile = get_tile(*bg_tile_pos) if bg_tile_pos else get_tile(0, 0)
    center_tile = get_tile(*center_tile_pos) if center_tile_pos else get_tile(1, 0)

    if generate_transitions:
        progress.start_stage("Generate dithered transitions")
        trans_dir = os.path.join(output_dir, "transitions")
        paths = generate_dithered_transition_set(
            center_tile, bg_tile, trans_dir, "tile",
        )
        generated["transitions"] = paths
        progress.end_stage(f"{len(paths)} transition tiles")

    if generate_autotile:
        progress.start_stage("Generate 47-tile autotile set")
        auto_dir = os.path.join(output_dir, "autotile47")
        result = generate_autotile47_set(
            center_tile, bg_tile, auto_dir, "tile",
        )
        generated["autotile"] = result
        progress.end_stage(f"{len(result)} autotile outputs")

    if generate_variants:
        progress.start_stage("Generate palette variants")
        variant_dir = os.path.join(output_dir, "variants")
        os.makedirs(variant_dir, exist_ok=True)
        variants = generate_palette_variants(center_tile)
        for name, variant_img in variants.items():
            path = os.path.join(variant_dir, f"tile_{name}.png")
            variant_img.save(path)
            generated["variants"].append(path)
            print(f"  Variant {name}: {path}")
        progress.end_stage(f"{len(variants)} color variants")

    if to_size is not None:
        progress.start_stage(f"Batch resize to {to_size}x{to_size}")
        resized_path = os.path.join(output_dir, f"tilemap_{to_size}px.png")
        result = batch_resize_tilemap(
            source_path, resized_path, tile_size, to_size, spacing, method="scale2x",
        )
        generated["resized"] = result
        progress.end_stage(f"{result['totalTiles']} tiles resized")

    progress.finish()
    return generated


# =============================================================================
# Pipeline: Full (Analyze → Compare → Generate → Verify)
# =============================================================================

def pipeline_full(
    source_path: str,
    project_path: Optional[str],
    tile_size: int,
    spacing: int,
    output_dir: str,
    to_size: Optional[int] = None,
) -> Dict[str, Any]:
    """Run the complete asset pipeline."""
    os.makedirs(output_dir, exist_ok=True)

    name = Path(source_path).stem
    results = {"timestamp": datetime.now().isoformat(), "stages": {}}

    print("\n" + "=" * 70)
    print("  FULL ASSET PIPELINE")
    print(f"  Source: {source_path}")
    if project_path:
        print(f"  Project: {project_path}")
    print("=" * 70)

    # 1. Analyze source
    print("\n\n>>> STAGE 1: ANALYZE SOURCE <<<")
    analysis_dir = os.path.join(output_dir, "analysis")
    results["stages"]["analyze"] = pipeline_analyze(
        source_path, tile_size, spacing, analysis_dir, deep=True, name=name,
    )

    # 2. Compare (if project tileset provided)
    if project_path and os.path.exists(project_path):
        print("\n\n>>> STAGE 2: COMPARE WITH PROJECT <<<")
        compare_dir = os.path.join(output_dir, "comparison")
        results["stages"]["compare"] = pipeline_compare(
            project_path, source_path,
            project_tile_size=tile_size,
            source_tile_size=tile_size,
            source_spacing=spacing,
            output_dir=compare_dir,
        )
    else:
        print("\n\n>>> STAGE 2: COMPARE - Skipped (no project tileset) <<<")

    # 3. Generate
    print("\n\n>>> STAGE 3: GENERATE TILES <<<")
    generate_dir = os.path.join(output_dir, "generated")
    results["stages"]["generate"] = pipeline_generate(
        source_path, tile_size, spacing, generate_dir,
        to_size=to_size,
    )

    # 4. Summary report
    report_path = os.path.join(output_dir, f"{name}_pipeline_report.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2, default=str)

    print("\n" + "=" * 70)
    print("  PIPELINE SUMMARY")
    print("=" * 70)
    if "analyze" in results["stages"]:
        a = results["stages"]["analyze"]
        print(f"  Analyzed: {a['nonBlankTiles']} tiles, {a['duplicateGroups']} duplicate groups")
        print(f"  Categories: {', '.join(a['categories'])}")
    if "compare" in results["stages"]:
        c = results["stages"]["compare"].get("summary", {})
        print(f"  Compared: {c.get('totalCompared', 0)} tiles")
        print(f"    Exact: {c.get('exactMatches', 0)}, Close: {c.get('closeMatches', 0)}, None: {c.get('noMatch', 0)}")
    if "generate" in results["stages"]:
        g = results["stages"]["generate"]
        print(f"  Generated: {len(g.get('transitions', []))} transitions, "
              f"{len(g.get('autotile', {}))} autotile outputs, "
              f"{len(g.get('variants', []))} variants")
    print(f"\n  Full report: {report_path}")
    print("=" * 70)

    return results


# =============================================================================
# Pipeline: Palette Comparison Across Packs
# =============================================================================

def pipeline_palette(
    tilemap_paths: List[str],
    tile_size: int,
    output_path: str,
) -> Dict[str, Any]:
    """Compare palettes across multiple tilemap packs for compatibility."""
    progress = ProgressReporter(len(tilemap_paths) + 1)

    palettes = []
    for path in tilemap_paths:
        name = Path(path).stem
        progress.start_stage(f"Extract palette: {name}")
        pal = extract_tilemap_palette(path, tile_size)
        palettes.append({"name": name, "path": path, "palette": pal})
        stats = pal.get("stats", {})
        progress.end_stage(f"{stats.get('uniqueColors', 0)} colors, lum={stats.get('luminanceMean', 0):.1f}")

    # Cross-compare all pairs
    progress.start_stage("Cross-compare palette pairs")
    comparisons = []
    for i in range(len(palettes)):
        for j in range(i + 1, len(palettes)):
            result = compare_palettes(palettes[i]["palette"], palettes[j]["palette"])
            comparisons.append({
                "packA": palettes[i]["name"],
                "packB": palettes[j]["name"],
                **result,
            })
            status = "PASS" if result["compatible"] else "FAIL"
            print(f"    {palettes[i]['name']} <-> {palettes[j]['name']}: "
                  f"{result['score']}/100 [{status}]")

    progress.end_stage(f"{len(comparisons)} pairs compared")
    progress.finish()

    report = {
        "timestamp": datetime.now().isoformat(),
        "packs": [{"name": p["name"], "path": p["path"], "stats": p["palette"].get("stats", {})} for p in palettes],
        "comparisons": comparisons,
        "overallCompatibility": all(c["compatible"] for c in comparisons),
    }

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\nPalette report saved to {output_path}")
    return report


# =============================================================================
# CLI
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Unified Kenney Asset Pipeline"
    )
    subparsers = parser.add_subparsers(dest="command")

    # analyze
    p_analyze = subparsers.add_parser("analyze", help="Deep analyze a tileset")
    p_analyze.add_argument("--input", "-i", required=True)
    p_analyze.add_argument("--tile-size", type=int, default=16)
    p_analyze.add_argument("--spacing", type=int, default=0)
    p_analyze.add_argument("--output-dir", "-o", default="tools/analysis")
    p_analyze.add_argument("--name", help="Override output name")
    p_analyze.add_argument("--deep", action="store_true", default=True)
    p_analyze.add_argument("--no-deep", dest="deep", action="store_false")

    # compare
    p_compare = subparsers.add_parser("compare", help="Compare project vs source tiles")
    p_compare.add_argument("--project", "-p", required=True)
    p_compare.add_argument("--source", "-s", required=True)
    p_compare.add_argument("--tile-size", type=int, default=16)
    p_compare.add_argument("--source-spacing", type=int, default=0)
    p_compare.add_argument("--output-dir", "-o", default="tools/analysis/comparison")
    p_compare.add_argument("--threshold", type=int, default=5)

    # generate
    p_gen = subparsers.add_parser("generate", help="Generate tiles from source")
    p_gen.add_argument("--source", "-s", required=True)
    p_gen.add_argument("--tile-size", type=int, default=16)
    p_gen.add_argument("--spacing", type=int, default=0)
    p_gen.add_argument("--output-dir", "-o", required=True)
    p_gen.add_argument("--bg-col", type=int, default=0)
    p_gen.add_argument("--bg-row", type=int, default=0)
    p_gen.add_argument("--center-col", type=int, default=1)
    p_gen.add_argument("--center-row", type=int, default=0)
    p_gen.add_argument("--to-size", type=int, help="Target tile size for resizing")
    p_gen.add_argument("--no-transitions", action="store_true")
    p_gen.add_argument("--no-autotile", action="store_true")
    p_gen.add_argument("--no-variants", action="store_true")

    # full
    p_full = subparsers.add_parser("full", help="Complete pipeline: analyze → compare → generate")
    p_full.add_argument("--source", "-s", required=True)
    p_full.add_argument("--project", "-p", help="Project tileset for comparison")
    p_full.add_argument("--tile-size", type=int, default=16)
    p_full.add_argument("--spacing", type=int, default=0)
    p_full.add_argument("--output-dir", "-o", required=True)
    p_full.add_argument("--to-size", type=int, help="Target tile size for resizing")

    # palette
    p_pal = subparsers.add_parser("palette", help="Cross-pack palette compatibility")
    p_pal.add_argument("--tilemaps", nargs="+", required=True)
    p_pal.add_argument("--tile-size", type=int, default=16)
    p_pal.add_argument("--output", "-o", default="tools/analysis/palette_report.json")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == "analyze":
        pipeline_analyze(
            args.input, args.tile_size, args.spacing,
            args.output_dir, deep=args.deep, name=args.name,
        )

    elif args.command == "compare":
        pipeline_compare(
            args.project, args.source,
            args.tile_size, args.tile_size, args.source_spacing,
            args.output_dir, args.threshold,
        )

    elif args.command == "generate":
        pipeline_generate(
            args.source, args.tile_size, args.spacing,
            args.output_dir,
            bg_tile_pos=(args.bg_col, args.bg_row),
            center_tile_pos=(args.center_col, args.center_row),
            generate_transitions=not args.no_transitions,
            generate_autotile=not args.no_autotile,
            generate_variants=not args.no_variants,
            to_size=args.to_size,
        )

    elif args.command == "full":
        pipeline_full(
            args.source, args.project,
            args.tile_size, args.spacing,
            args.output_dir, args.to_size,
        )

    elif args.command == "palette":
        pipeline_palette(args.tilemaps, args.tile_size, args.output)


if __name__ == "__main__":
    main()
