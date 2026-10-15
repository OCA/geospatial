# Copyright 2026 Cetmix OÜ
# License LGPL-3.0 or later (https://www.gnu.org/licenses/lgpl-3.0).

{
    "name": "Mapbox Widget",
    "summary": "Mapbox map widget",
    "version": "18.0.1.0.0",
    "development_status": "Beta",
    "category": "Hidden",
    "website": "https://github.com/OCA/geospatial",
    "author": "Cetmix, Odoo Community Association (OCA)",
    "license": "LGPL-3",
    "depends": ["web", "base_setup"],
    "data": [
        "views/res_config_settings_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "web_widget_mapbox/static/src/**/*",
        ],
        "web.assets_unit_tests": [
            "web_widget_mapbox/static/tests/*",
        ],
    },
    "installable": True,
}
