# Copyright 2026 mytime.click
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).
{
    "name": "Geoengine Advanced Search",
    "summary": "Search geo fields in the search bar with the spatial operators "
    "and the records of another model as value",
    "version": "20.0.1.0.0",
    "category": "GeoBI",
    "author": "Camptocamp,ACSONE SA/NV,Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base_geoengine", "web"],
    "assets": {
        "web.assets_backend": [
            "geoengine_advanced_search/static/src/js/**/*",
        ],
    },
    "installable": True,
}
