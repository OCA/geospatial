# Copyright (C) 2024 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Javascript Library",
    "summary": "Bring leaflet.js librairy in odoo.",
    "version": "17.0.1.0.0",
    "author": "GRAP, Odoo Community Association (OCA)",
    "maintainers": ["legalsylvain"],
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": ["base"],
    "data": ["data/ir_config_parameter.xml"],
    "demo": ["demo/ir_config_parameter.xml"],
    "assets": {
        "web.assets_backend": [
            "/web_leaflet_lib/static/lib/leaflet/leaflet.css",
            "/web_leaflet_lib/static/lib/leaflet/leaflet.js",
        ],
    },
    "installable": True,
}
