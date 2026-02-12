#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SOURCE_MAP="$ROOT_DIR/world/packs/base/maps/grid_town_outdoor.json"
SERVER_MAP="$ROOT_DIR/packages/server/assets/maps/village.json"
CLIENT_MAP="$ROOT_DIR/packages/client/public/assets/maps/village.json"

if [ ! -f "$SOURCE_MAP" ]; then
  echo "ERROR: Source map not found: $SOURCE_MAP"
  exit 1
fi

echo "Syncing maps from world pack..."
cp "$SOURCE_MAP" "$SERVER_MAP"
cp "$SOURCE_MAP" "$CLIENT_MAP"

echo "Maps synced successfully:"
echo "  Source: $SOURCE_MAP"
echo "  -> Server: $SERVER_MAP"
echo "  -> Client: $CLIENT_MAP"
echo ""
echo "MD5 checksums:"
if command -v md5sum &> /dev/null; then
  md5sum "$SOURCE_MAP" "$SERVER_MAP" "$CLIENT_MAP"
elif command -v md5 &> /dev/null; then
  md5 "$SOURCE_MAP" "$SERVER_MAP" "$CLIENT_MAP"
else
  echo "Warning: Could not find md5 or md5sum to verify checksums."
fi
