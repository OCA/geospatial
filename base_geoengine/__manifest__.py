# Copyright 2011-2015 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Payot (Camptocamp SA)
# Copyright 2023 ACSONE SA/NV
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    "name": "Geospatial support for Odoo",
    "version": "16.0.1.0.0",
    "category": "GeoBI",
    "author": "Camptocamp,ACSONE SA/NV,Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base", "web"],
    "data": [
        "security/data.xml",
        "views/base_geoengine_view.xml",
        "views/ir_model_view.xml",
        "views/ir_view_view.xml",
        "views/geo_raster_layer_view.xml",
        "views/geo_vector_layer_view.xml",
        "security/ir.model.access.csv",
    ],
    "assets": {
        "web.assets_backend": [
            "base_geoengine/static/src/js/**/*",
            "base_geoengine/static/src/css/style.css",
            "web/static/src/libs/fontawesome/css/font-awesome.css",
            ("include", "web._assets_helpers"),
            "web/static/src/scss/pre_variables.scss",
            "web/static/lib/bootstrap/scss/_variables.scss",
            ("include", "web._assets_bootstrap"),
        ]
    },
    "external_dependencies": {"python": ["shapely", "geojson", "simplejson"]},
    "installable": True,
    "pre_init_hook": "init_postgis",
}
