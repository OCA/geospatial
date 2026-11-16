# Copyright 2026 mytime.click
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
{
    "name": "Geoengine Advanced Search Logo",
    "summary": "Show the image (e.g. a logo) of the records picked as value "
    "of a geo condition in the search bar",
    "version": "20.0.1.0.1",
    "category": "GeoBI",
    "author": "mytime.click,Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["geoengine_advanced_search", "web"],
    "assets": {
        "web.assets_backend": [
            "geoengine_advanced_search_logo/static/src/js/*.esm.js",
        ],
    },
    "installable": True,
}
