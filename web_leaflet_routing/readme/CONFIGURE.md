Configure routing providers through System Parameters
(Settings > Technical > Parameters > System Parameters).

## System Parameters

| Key | Default | Description |
|-----|---------|-------------|
| `leaflet.routing_provider` | `osrm` | Routing provider: `osrm`, `mapbox`, or `auto` |
| `leaflet.osrm_url` | `https://router.project-osrm.org` | OSRM server URL |
| `leaflet.mapbox_token` | (empty) | MapBox API access token |
| `leaflet.max_waypoints` | `25` | Maximum waypoints per route request |

## Provider Selection

- **osrm**: Always use OSRM (free, no API key required)
- **mapbox**: Always use MapBox (requires API token)
- **auto**: Try MapBox first if token configured, fallback to OSRM

## OSRM Configuration (Recommended)

OSRM (Open Source Routing Machine) is free and can be self-hosted.

**Using public server (default):**

No configuration needed. The default URL `https://router.project-osrm.org`
provides free routing with reasonable rate limits.

**Self-hosted OSRM:**

For production use with high volumes, deploy your own OSRM server:

1. Download OSM data for your region
2. Run OSRM backend with Docker or native installation
3. Set `leaflet.osrm_url` to your server address

```
leaflet.osrm_url = http://your-osrm-server:5000
```

See https://github.com/Project-OSRM/osrm-backend for setup instructions.

## MapBox Configuration (Premium)

MapBox offers premium routing with additional features.

1. Create account at https://www.mapbox.com/
2. Generate an access token with Directions API scope
3. Set the system parameters:

```
leaflet.routing_provider = mapbox
leaflet.mapbox_token = pk.your_mapbox_token_here
```

## Rate Limiting

**OSRM Public Server:**

- Shared instance with usage limits
- Suitable for development and low-volume production
- Consider self-hosting for high-volume usage

**MapBox:**

- Free tier: 100,000 requests/month
- Pay-as-you-go pricing beyond free tier
- See https://www.mapbox.com/pricing for details

## Routing Profiles

Both providers support these profiles:

| Profile | Description |
|---------|-------------|
| `driving` | Car routing (default) |
| `walking` | Pedestrian routing |
| `cycling` | Bicycle routing |

## Troubleshooting

**Routes not calculating:**

1. Verify coordinates are valid (lat: -90 to 90, lng: -180 to 180)
2. Check browser console for API errors
3. Verify `leaflet.osrm_url` is accessible

**MapBox authentication errors:**

1. Verify token is correctly set in System Parameters
2. Check token has Directions API scope enabled
3. Verify account has available quota
