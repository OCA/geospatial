# Copyright 2019 Camptocamp SA
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).
{
    "name": "GeoEngine - Swisstopo layers",
    "version": "13.0.1.0.0",
    "category": "GeoBI",
    "author": "Camptocamp,Odoo Community Association (OCA)",
    "license": "AGPL-3",
    "website": "https://github.com/OCA/geospatial",
    "depends": ["base_geoengine"],
    "data": [
        "views/geoengine_swisstopo_view.xml",
        "geo_view/geo_raster_layer_view.xml",
    ],
    "installable": True,
}
