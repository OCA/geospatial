Add a JSON field on the model that should show a map, then use the widget
in the form view:

```xml
<field name="my_map" widget="mapbox"/>
```

The field value must be a JSON **object**. `null`, `false`, or a non-object
value show a placeholder instead of a map. Unknown extra keys are kept
when the widget writes.

The map container is full width of the field and **400px** tall. A missing
Mapbox token, a failed CDN load, or empty / non-object data each show a
translated placeholder and do not construct a map.

## Payload

```json
{
  "elements": [],
  "style": {
    "map": "mapbox://styles/mapbox/streets-v12",
    "satellite": "mapbox://styles/mapbox/satellite-streets-v12"
  },
  "default_center": {"lat": 52.37, "lon": 4.89},
  "default_zoom": 12,
  "allow_zoom": true,
  "allow_pan": true,
  "allow_fullscreen": true,
  "default_pitch": 0,
  "allow_pitch": true,
  "updated": []
}
```

| Key | Type | Default if omitted |
|-----|------|-------------------|
| `elements` | array of marker objects | `[]` |
| `style.map` | Mapbox style URL | `mapbox://styles/mapbox/streets-v12` |
| `style.satellite` | Mapbox style URL | `mapbox://styles/mapbox/satellite-streets-v12` |
| `default_center` | `{lat, lon}` | first valid element, else `{"lat": 0, "lon": 0}` |
| `default_zoom` | number | `12` |
| `allow_zoom` | bool | `true` |
| `allow_pan` | bool | `true` |
| `allow_fullscreen` | bool | `true` (Mapbox fullscreen control) |
| `default_pitch` | number | `0`, clamped to `[0, 85]` |
| `allow_pitch` | bool | `true` |
| `updated` | array | `[]`; written by the widget after a drag |

The map does **not** fit bounds. When `default_center` is a valid
`{lat, lon}` pair it is used even if markers exist. Otherwise the camera
centers on the first valid element.

Classic Mapbox style URLs only — not Mapbox Standard. The initial style is
`style.map`, unless the browser already stores a Satellite preference (see
below).

## Map / Satellite preference

The Map / Satellite control writes the last choice to browser storage
(`web_widget_mapbox.style`: `map` or `satellite`) and applies it to
**every** mapbox widget on this origin, including maps that are already
open. New maps start with that choice. An invalid or missing value falls
back to Map. The preference survives page reloads on the same origin.

Changing style keeps the current pitch.

## Markers

| Key | Type | Notes |
|-----|------|-------|
| `lat` / `lon` | number | required for a visible marker; `lat` in `[-90, 90]`, `lon` in `[-180, 180]` |
| `label` | string | optional; Mapbox popup when a form is not opened |
| `rec_model` | string | model to open on click |
| `rec_id` | int | positive id of `rec_model` |
| `clickable` | bool | default `false`; with `rec_model` and `rec_id` opens a popup form |
| `icon` | string | Font Awesome 4.7 name, with or without the `fa-` prefix |
| `size` | int | optional size in pixels of the custom `icon` element; ignored when `icon` is omitted |
| `color` | string | optional HEX `#RGB` or `#RRGGBB`; tints the default Mapbox pin or the Font Awesome icon |
| `editable` | bool | default `false`; when true and the field is writable, the marker can be dragged |
| `index` | int | only on `updated` items; 0-based index in `elements` |

Invalid coordinates are skipped. Every valid element is drawn as an equal
marker. When several markers share a location, earlier items in
`elements` are drawn on top (so list order controls which pin receives
clicks). Invalid or omitted `color` leaves the default Mapbox pin color,
or the icon’s inherited color.

A marker click opens a popup form (`FormViewDialog`) only when `clickable`
is true **and** `rec_model` is a non-empty string **and** `rec_id` is a
positive integer. If that triple is incomplete, the form is not opened
(the label popup is used instead when `label` is set). A click that
follows a drag does not open the form. If the map is in fullscreen, the
click leaves fullscreen first so the form is visible, then the map is
resized to the in-page container.

## Drag and `updated`

Dragging does not rewrite `elements`. On drag end the widget copies that
element, sets `lat` / `lon` from the marker, sets `index` to the source
position, and upserts it into root `updated`. Extra element keys
(including `clickable`, `rec_model`, `rec_id`, and `color`) are copied onto the
`updated` item.

Drag is enabled only when the field is not readonly, `editable` is true,
and the coordinates are valid.

## Payload updates

When the field value changes (for example a computed JSON that
recomputes):

- Changes to `elements` (or other marker data) rebuild markers only. The
  camera is **not** reset.
- Changes to camera keys (`default_center`, `default_zoom`,
  `default_pitch`), style URLs, or `allow_zoom` / `allow_pan` /
  `allow_pitch` / `allow_fullscreen` recreate the map so the new config
  applies.
- Switching to another record always recreates the map for that record’s
  payload.

## Computed non-stored JSON

Display works on a computed JSON field that is **not** stored. Odoo
defaults `store=False` and `readonly=True` unless an inverse is set, so
the map still renders when the field is in the view.

`updated` is persisted only when the field is writable (stored, or
computed with an inverse / `readonly=False`). Do not set `store=True`
unless the consuming module needs those writes.

Example of a computed non-stored field (typical consumer; **not** added
by this addon):

```python
map_data = fields.Json(compute="_compute_map_data")

def _compute_map_data(self):
    for rec in self:
        rec.map_data = {
            "elements": [...],
            "default_center": {
                "lat": rec.partner_latitude,
                "lon": rec.partner_longitude,
            },
            "default_zoom": 12,
        }
```
