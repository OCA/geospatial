# Copyright (C) 2024 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Javascript Library",
    "summary": "Bring leaflet.js library in Odoo with geocoding and routing support.",
    "version": "18.0.1.2.0",
    "author": "GRAP, KMEE, Odoo Community Association (OCA)",
    "maintainers": ["legalsylvain", "mileo"],
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": ["base"],
    "external_dependencies": {
        "python": ["requests"],
    },
    "data": [
        "data/ir_config_parameter.xml",
        "views/res_config_settings.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "/web_leaflet_lib/static/lib/leaflet/*",
            "/web_leaflet_lib/static/lib/leaflet_markercluster/*",
        ],
    },
    "installable": True,
    "post_init_hook": "post_init_hook",
}
