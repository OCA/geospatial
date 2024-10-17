# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

{
    "name": "Leaflet Map View (OpenStreetMap)",
    "summary": "Integrate leaflet.js librairy with odoo"
    " and add new 'leaflet_map' view, to display markers.",
    "version": "17.0.1.0.0",
    "development_status": "Alpha",
    "author": "GRAP, Odoo Community Association (OCA)",
    "maintainers": ["legalsylvain"],
    "website": "https://github.com/OCA/geospatial",
    "license": "AGPL-3",
    "category": "Extra Tools",
    "depends": [
        "base_geolocalize",
    ],
    "data": ["data/ir_config_parameter.xml", "views/res_partner.xml"],
    "demo": [
        "demo/ir_config_parameter.xml",
        "demo/res_partner.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "web_view_leaflet_map/static/src/js/**/*",
            "web_view_leaflet_map/static/src/css/*",
            "web_view_leaflet_map/static/lib/leaflet/*",
        ],
    },
    "installable": True,
    "uninstall_hook": "uninstall_hook",
}
