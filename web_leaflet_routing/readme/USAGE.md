This module provides routing services that can be used both in Python (server-side)
and JavaScript (client-side).

## Enabling Routing in Views

To enable routing visualization in a leaflet_map view, add the `routing` attribute:

```xml
<leaflet_map
    field_latitude="partner_latitude"
    field_longitude="partner_longitude"
    routing="1"
    group_by="driver_id"
>
    <field name="display_name"/>
    <field name="partner_latitude"/>
    <field name="partner_longitude"/>
    <field name="driver_id"/>
    <field name="sequence"/>
</leaflet_map>
```

When routing is enabled, the map will draw polylines connecting markers in
sequence order, grouped by the `group_by` field if configured.

## Python Mixin Usage

The `leaflet.routing.mixin` provides routing capabilities for your models:

```python
from odoo import models

class DeliveryRoute(models.Model):
    _name = 'delivery.route'
    _inherit = ['leaflet.routing.mixin']

    def compute_route_distance(self):
        """Calculate total route distance and duration."""
        for route in self:
            waypoints = [
                [stop.partner_latitude, stop.partner_longitude]
                for stop in route.stop_ids.sorted('sequence')
                if stop.partner_latitude and stop.partner_longitude
            ]

            if len(waypoints) >= 2:
                result = self.get_route(waypoints, profile='driving')
                if result:
                    route.distance = result.get('distance', 0)  # meters
                    route.duration = result.get('duration', 0)  # seconds
```

### Available Methods

**`get_route(waypoints, profile='driving')`**

Get a route between waypoints.

- `waypoints`: List of `[lat, lng]` coordinate pairs
- `profile`: Routing profile (`driving`, `walking`, `cycling`)
- Returns: `dict` with `geometry`, `distance`, `duration`, `legs`

**`get_optimized_route(waypoints, profile='driving', roundtrip=False)`**

Get an optimized route (TSP - Traveling Salesman Problem).

- `waypoints`: List of `[lat, lng]` coordinate pairs
- `profile`: Routing profile
- `roundtrip`: Whether to return to starting point
- Returns: `dict` with route data and `waypoint_order`

**`get_distance_matrix(origins, destinations=None)`**

Get distances and durations between multiple points.

- `origins`: List of `[lat, lng]` pairs
- `destinations`: List of `[lat, lng]` pairs (defaults to origins)
- Returns: `dict` with `distances` and `durations` matrices

## JavaScript Service Usage

For client-side routing, import the `RoutingService`:

```javascript
import { RoutingService } from "@web_leaflet_routing/routing_service.esm";

const routingService = new RoutingService();

// Get a simple route
const waypoints = [
    [-23.550520, -46.633308],  // Sao Paulo
    [-22.906847, -43.172896],  // Rio de Janeiro
];

const route = await routingService.getRoute(waypoints, 'driving');
if (route) {
    console.log(`Distance: ${routingService.formatDistance(route.distance)}`);
    console.log(`Duration: ${routingService.formatDuration(route.duration)}`);

    // route.geometry contains [lat, lng] pairs for drawing polylines
    L.polyline(route.geometry, {color: 'blue'}).addTo(map);
}

// Get optimized route
const optimized = await routingService.getOptimizedRoute(waypoints, 'driving', false);
if (optimized) {
    console.log('Optimal order:', optimized.waypointOrder);
}
```

## Route Response Structure

Both Python and JavaScript methods return similar structures:

```javascript
{
    geometry: [[lat, lng], ...],  // Polyline coordinates
    distance: 450000,             // Total distance in meters
    duration: 18000,              // Total duration in seconds
    legs: [                       // Segments between waypoints
        {
            distance: 225000,
            duration: 9000,
            steps: [
                {
                    distance: 1500,
                    duration: 120,
                    instruction: "Turn right",
                    name: "Main Street"
                }
            ]
        }
    ],
    provider: "osrm"              // Which provider was used
}
```
