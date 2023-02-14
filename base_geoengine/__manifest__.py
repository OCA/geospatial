# Copyright 2011-2015 Nicolas Bessi (Camptocamp SA)
# Copyright 2016 Yannick Payot (Camptocamp SA)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    "name": "Geospatial support for Odoo",
    "version": "14.0.1.0.1",
    "category": "GeoBI",
    "author": "Camptocamp,ACSONE SA/NV,Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base", "web"],
    "data": [
        "security/data.xml",
        "views/assets.xml",
        "views/base_geoengine_view.xml",
        "geo_ir/ir_model_view.xml",
        "geo_view/ir_view_view.xml",
        "geo_view/geo_raster_layer_view.xml",
        "geo_view/geo_vector_layer_view.xml",
        "security/ir.model.access.csv",
    ],
    "external_dependencies": {"python": ["shapely", "geojson", "simplejson"]},
    "qweb": ["static/src/xml/geoengine.xml"],
    "installable": True,
    "pre_init_hook": "init_postgis",
}
