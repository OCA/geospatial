# Copyright 2026 Cetmix OÜ
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

{
    "name": "Mapbox Widget Demo",
    "summary": "Demo of the Mapbox form widget on partners",
    "version": "18.0.1.0.0",
    "development_status": "Beta",
    "category": "Extra Tools",
    "website": "https://github.com/OCA/geospatial",
    "author": "Cetmix, Odoo Community Association (OCA)",
    "license": "LGPL-3",
    "depends": [
        "base_geolocalize",
        "web_widget_mapbox",
    ],
    "data": [
        "views/res_partner_views.xml",
    ],
    "demo": [
        "demo/res_partner_demo.xml",
    ],
    "installable": True,
}
