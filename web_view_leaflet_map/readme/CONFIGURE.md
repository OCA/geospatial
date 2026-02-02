To use this view, define a `leaflet_map` view in your XML:

```xml
<leaflet_map
    field_latitude="partner_latitude"
    field_longitude="partner_longitude"
    field_title="display_name"
    field_address="contact_address"
    field_marker_icon_image="avatar_128"
    show_pin_list="1"
    numbered_markers="1"
    routing="1"
    enable_navigation="1"
    group_by="category_id"
    panel_title="Locations"
>
    <field name="display_name"/>
    <field name="partner_latitude"/>
    <field name="partner_longitude"/>
    <field name="contact_address"/>
    <field name="category_id"/>
</leaflet_map>
```

**Required Attributes:**

| Attribute | Description |
|-----------|-------------|
| `field_latitude` | Field containing latitude coordinates |
| `field_longitude` | Field containing longitude coordinates |

**Display Attributes:**

| Attribute | Default | Description |
|-----------|---------|-------------|
| `field_title` | `display_name` | Field for marker title/label |
| `field_address` | - | Field for address in popup |
| `field_marker_icon_image` | - | Image field for custom marker icon |
| `marker_icon_size_x` | 64 | Custom icon width in pixels |
| `marker_icon_size_y` | 64 | Custom icon height in pixels |

**Map Options:**

| Attribute | Default | Description |
|-----------|---------|-------------|
| `default_zoom` | 7 | Initial map zoom level |
| `max_zoom` | 19 | Maximum zoom level |
| `zoom_snap` | 1 | Zoom level increments |

**New Attributes (v18.0.1.2.0):**

| Attribute | Default | Description |
|-----------|---------|-------------|
| `show_pin_list` | "1" | Show sidebar with marker list |
| `panel_title` | "Locations" | Title for the sidebar |
| `numbered_markers` | "0" | Show numbered markers instead of icons |
| `routing` | "0" | Enable route polylines between markers |
| `enable_navigation` | "1" | Show Google Maps navigation buttons |
| `group_by` | - | Field for grouping markers by color |

**System Configuration:**

Configure geocoding and routing providers in Settings > Leaflet Maps:

- Geocoding Provider: Nominatim (OSM) free with 1 req/s limit, or MapBox (premium)
- Routing Provider: OSRM free and self-hostable, or MapBox (premium)
- Default Nominatim URL: `https://nominatim.openstreetmap.org`
- Default OSRM URL: `https://router.project-osrm.org`
