# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Map View (OpenStreetMap)",
    "summary": "Add new 'leaflet_map' view, to display markers.",
    "version": "16.0.2.0.0",
    "development_status": "Alpha",
    "author": "GRAP, Odoo Community Association (OCA)",
    "maintainers": ["legalsylvain"],
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": [
        "base_geolocalize",
        "web_leaflet_lib",
    ],
    "assets": {
        "web.assets_backend": [
            "web_view_leaflet_map/static/src/js/view/view_registry.js",
            "web_view_leaflet_map/static/src/js/view/map/map_renderer.js",
            "web_view_leaflet_map/static/src/js/view/map/map_view.js",
            "web_view_leaflet_map/static/src/css/web_view_leaflet_map.css",
        ],
    },
    "installable": True,
    "uninstall_hook": "uninstall_hook",
}
