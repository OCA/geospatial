# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Routing",
    "summary": "Add OSRM/MapBox routing and geocoding services to Leaflet maps.",
    "version": "18.0.1.0.0",
    "author": "KMEE, Odoo Community Association (OCA)",
    "maintainers": ["miloefb"],
    "development_status": "Beta",
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": [
        "web_view_leaflet_map",
    ],
    "external_dependencies": {
        "python": ["requests"],
    },
    "data": [
        "security/ir.model.access.csv",
    ],
    "assets": {
        "web.assets_backend": [
            "web_leaflet_routing/static/src/routing_service.esm.js",
            "web_leaflet_routing/static/src/geocoding_service.esm.js",
            "web_leaflet_routing/static/src/components/routing_renderer.esm.js",
        ],
    },
    "installable": True,
}
