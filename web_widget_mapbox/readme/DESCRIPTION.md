This module adds a form-view Mapbox map widget for JSON fields.

Declare a `fields.Json` field on any model and set `widget="mapbox"` in the
form arch. The widget renders markers from a JSON payload, supports map and
satellite styles, zoom, pan, pitch, and fullscreen, and can open a popup
form when a marker is marked clickable.

Markers may use optional Font Awesome icons, sizes, and HEX colors. When
several markers share a location, earlier items in the payload are drawn on
top. The Map / Satellite control remembers the last choice in the browser
and applies it to every mapbox widget on that origin.

Mapbox GL JS is loaded from the Mapbox CDN at runtime and is not vendored
in this addon.
