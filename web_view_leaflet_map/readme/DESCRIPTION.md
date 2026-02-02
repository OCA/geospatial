This module extends Odoo views to add a new kind of view named
`leaflet_map` that uses the Leaflet javascript library for interactive maps.
(https://leafletjs.com/) This library is used by projects like
OpenStreetMap. (https://www.openstreetmap.org/)

**Core Map View:**

- Display records as markers on an interactive map
- Automatic marker clustering for better visibility when zoomed out
- Custom marker icons from image fields
- Click markers to open popups with record details
- Click popup to navigate to record form view

**Sidebar/Pin List (NEW):**

- Collapsible sidebar showing all map markers in a list
- Search and filter within the sidebar
- Click items to center map on marker
- Visual grouping by field (e.g., category)
- Show located/unlocated record counts

**Enhanced Markers (NEW):**

- Numbered markers showing sequence
- Color coding by group
- Google Maps navigation buttons in popups
- Coordinate validation (lat: -90..90, lng: -180..180)

**Routing Support (NEW - requires web_leaflet_routing):**

- Route polylines between markers
- OSRM integration for real road routes
- Route distance and duration display

See `web_view_leaflet_map_partner` module for a complete example
that displays contacts on a map with avatar markers, grouped sidebar,
auto-geocoding, and Google Maps navigation.

![Precise Map View](../static/description/view_res_partner_map_precise.png)

If user zooms out, nearby markers are grouped together thanks to
`Leaflet.markercluster` plugin.

![Large Map View](../static/description/view_res_partner_map_large.png)
