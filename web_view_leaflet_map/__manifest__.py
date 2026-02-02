# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Map View (OpenStreetMap)",
    "summary": "Leaflet map view with sidebar, routing, and numbered markers.",
    "version": "18.0.2.0.0",
    "author": "GRAP, KMEE, Odoo Community Association (OCA)",
    "maintainers": ["legalsylvain", "mileo"],
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": [
        "base_geolocalize",
        "web_leaflet_lib",
    ],
    "assets": {
        "web.assets_backend": [
            # Pin List component (base)
            "web_view_leaflet_map/static/src/components/pin-list/pin_list.esm.js",
            "web_view_leaflet_map/static/src/components/pin-list/pin_list.xml",
            "web_view_leaflet_map/static/src/components/pin-list/pin_list.css",
            # Draggable Pin List component (generic drag-drop)
            "web_view_leaflet_map/static/src/components/pin-list/draggable_pin_list.esm.js",
            "web_view_leaflet_map/static/src/components/pin-list/draggable_pin_list.xml",
            "web_view_leaflet_map/static/src/components/pin-list/draggable_pin_list.css",
            # Leaflet Map View - MVC architecture
            "web_view_leaflet_map/static/src/leaflet_map_view/leaflet_map_arch_parser.esm.js",
            "web_view_leaflet_map/static/src/leaflet_map_view/leaflet_map_model.esm.js",
            "web_view_leaflet_map/static/src/leaflet_map_view/leaflet_map_controller.esm.js",
            "web_view_leaflet_map/static/src/leaflet_map_view/leaflet_map_renderer.esm.js",
            "web_view_leaflet_map/static/src/leaflet_map_view/leaflet_map_view.esm.js",
            "web_view_leaflet_map/static/src/leaflet_map_view/leaflet_map_view.xml",
            # Shared styles
            "web_view_leaflet_map/static/src/components/map-component/web_view_leaflet_map.css",
        ],
    },
    "installable": True,
    "uninstall_hook": "uninstall_hook",
}
