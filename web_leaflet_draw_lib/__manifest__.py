# Copyright 2025 Advance Insight
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Draw Javascript Library",
    "summary": "Bring leaflet.draw.js library in odoo.",
    "version": "18.0.1.0.0",
    "author": "Advance Insight, Odoo Community Association (OCA)",
    "maintainers": ["NL66278'"],
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": ["web_leaflet_lib"],
    "data": [],
    "demo": [],
    "assets": {
        "web.assets_backend": [
            "/web_leaflet_draw_lib/static/lib/leaflet.draw/leaflet.draw.css",
            "/web_leaflet_draw_lib/static/lib/leaflet.draw/leaflet.draw.js",
        ],
    },
    "installable": True,
}
