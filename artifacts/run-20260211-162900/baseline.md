# Baseline Snapshot - 2026-02-11 16:29 KST

## Docker Status

- **Container**: `openclawworld-server`
- **Status**: Up 56 minutes (healthy)
- **Port**: 0.0.0.0:2567->2567/tcp
- **Image**: openclawworld-server:latest

## Health Check

```json
{
  "status": "ok",
  "server": "openclawworld",
  "version": "0.1.0",
  "env": "production",
  "timestamp": 1770794940829
}
```

## Server Metrics

- **Connections**: 1 active
- **Memory**: 27.95 MB current / 27.96 MB peak
- **Tick**: 0.15 ms avg
- **Uptime**: ~57 minutes
- **AIC Requests**: 5 total

## AIC API Status

- Endpoints available at `/aic/v0.1`
- Room creation is on-demand (requires client connection first)
- When no room exists, returns `not_found` error

### AIC Endpoints Verified

| Endpoint         | Status    | Notes                  |
| ---------------- | --------- | ---------------------- |
| POST /register   | Works     | Requires existing room |
| POST /observe    | Works     | Requires auth token    |
| POST /moveTo     | Works     | Requires auth token    |
| POST /interact   | Available | Not tested             |
| POST /chatSend   | Available | Not tested             |
| POST /pollEvents | Available | Not tested             |

## Existing Infrastructure

- 6 zones defined: lobby, office, meeting-center, lounge-cafe, arcade, plaza
- 12 NPCs with full dialogue trees
- Facility types fully defined (20+ types)
- Zone system with bounds and population tracking
- Map merging capability for unified world

## Current Map Layout (DEFAULT_ZONE_BOUNDS)

```
Map: 100x80 tiles (3200x2560 pixels)
┌──────────────┬──────────────┬────────────┬─────────┐
│    Lobby     │    Office    │            │         │
│   (0,0)      │   (1280,0)   │   Arcade   │  Plaza  │
│   40x40      │   40x40      │   (2560,0) │ (3200,0)│
├──────────────┼──────────────┤   20x80    │  30x40  │
│   Meeting    │    Lounge    │            │         │
│   (0,1280)   │ (1280,1280)  │            │         │
│   40x40      │   40x40      │            │         │
└──────────────┴──────────────┴────────────┴─────────┘
```

## Gap Analysis for Reference Image Implementation

| Current            | Required                    |
| ------------------ | --------------------------- |
| 100x80 tiles       | 64x52 tiles                 |
| 3200x2560 px       | 2048x1664 px                |
| Separate zone maps | Unified village_outdoor map |
| Basic tile IDs     | Real pixel art tileset      |
| No reference image | Match 2048x1650 reference   |

## Next Steps

1. Save reference image to `docs/reference/village_worklife_reference_2048x1650.png`
2. Create `docs/reference/map_spec.md` with zone coordinates
3. Invoke plan agent with full context
4. Begin implementation per bundle strategy
