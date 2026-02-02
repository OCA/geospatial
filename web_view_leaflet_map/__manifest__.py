# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Map View (OpenStreetMap)",
    "summary": "Add new 'leaflet_map' view, to display markers.",
    "version": "18.0.1.1.2",
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
            "web_view_leaflet_map/static/src/views/leaflet_map/leaflet_map_renderer.esm.js",
            "web_view_leaflet_map/static/src/views/leaflet_map/leaflet_map_renderer.xml",
            "web_view_leaflet_map/static/src/views/leaflet_map/leaflet_map_renderer.css",
            "web_view_leaflet_map/static/src/views/leaflet_map/leaflet_map_controller.esm.js",
            "web_view_leaflet_map/static/src/views/leaflet_map/leaflet_map_controller.xml",
            "web_view_leaflet_map/static/src/views/leaflet_map/leaflet_map_view.esm.js",
        ],
    },
    "installable": True,
    "uninstall_hook": "uninstall_hook",
}
