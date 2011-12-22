# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author B.Binet. Copyright Camptocamp SA
##############################################################################
{
    "name": "web Geoengine",
    "version": "2.0",
    "depends": ['web'],
    "js": [
        "static/src/js/OpenLayers.js",
        "static/src/js/mapfish/namespaces.js",
        "static/src/js/mapfish/Util.js",
        "static/src/js/mapfish/Color.js",
        "static/src/js/mapfish/GeoStat.js",
        "static/src/js/mapfish/GeoStat/ProportionalSymbol.js",
        "static/src/js/mapfish/GeoStat/Choropleth.js",
        "static/src/js/geoengine.js",
        ],
    "css": [
        "static/src/css/style.css",
        ],
    'qweb' : [
        "static/src/xml/*.xml",
    ],
    "active": True
}
