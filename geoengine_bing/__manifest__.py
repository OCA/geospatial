# Copyright 2019 MuK IT GmbH - Kerrim Abd El-Hamed
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

{
    "name": "GeoEngine Bing Raster Support",
    "version": "12.0.1.0.0",
    "author": "MuK IT,Odoo Community Association (OCA)",
    "category": "GeoBI",
    "license": "AGPL-3",
    "depends": [
        "base_geoengine",
    ],
    "contributors": [
        "Kerrim Abdelhamed <kerrim.abdelhamed@mukit.at>",
        "Mathias Markl <mathias.markl@mukit.at>",
    ],
    "data": [
        "geo_view/geo_raster_layer_view.xml",
        "views/geoengine_bing_view.xml",
    ],
    "installable": True,
    "auto_install": False,
    "application": False,
}
