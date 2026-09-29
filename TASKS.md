# Odoo Geospatial 17.0 -> 18.0 Upgrade Tasks

- [x] base_geoengine — already at 18.0.1.2.1, matches upstream `18.0` branch
- [x] web_leaflet_lib — already at 18.0.1.1.0, matches upstream `18.0` branch
- [x] web_widget_mapbox — already at 18.0.1.0.0, matches upstream `18.0` branch
- [x] base_geoengine_demo — migrated to 18.0.1.0.0
- [x] web_view_leaflet_map — already at 18.0.1.1.2, matches upstream `18.0` branch
- [x] web_leaflet_draw_lib — already at 18.0.1.0.0, matches upstream `18.0` branch
- [x] web_widget_mapbox_demo — already at 18.0.1.0.0, matches upstream `18.0` branch
- [x] web_view_leaflet_map_partner — already at 18.0.1.0.1, matches upstream `18.0`
      branch
- [x] geospatial_plot — already at 18.0.1.0.1, matches upstream `18.0` branch

All 9 modules are now on Odoo 18.0. Upgrade complete.

## Notes

- Verified via `git diff 18.0 -- <module>` producing 0 lines for all already-done
  modules.
- `base_geoengine_demo` depends on `base_geoengine` (already fully migrated to 18.0).
- See `base_geoengine_demo/UPGRADE.md` for the migration details of the last remaining
  module.
