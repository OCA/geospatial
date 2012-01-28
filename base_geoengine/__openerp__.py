# -*- encoding: utf-8 -*-
##############################################################################
#
#    Author Nicolas Bessi. Copyright Camptocamp SA
##############################################################################
{'name': 'Geospatial support for OpenERP',
 'version': '0.1',
 'category': 'GeoBI',
 'description': """
     Geospatial support based on PostGIS
     add the ability of server to server geojson
     to do geo CRUD and view definition
 """,
 'author': 'Camptocamp',
 'website': 'http://openerp.camptocamp.com',
 'depends': ['base'],
 'init_xml': [],
 'update_xml': ['data.xml',
                'company_view.xml',
                'geo_ir/ir_model_view.xml',
                'geo_view/ir_view_view.xml',
                'geo_view/geo_raster_layer_view.xml',
                'geo_view/geo_vector_layer_view.xml'],
 'demo_xml': [],
 'js': ["static/src/js/OpenLayers.js",
        "static/src/js/mapfish/namespaces.js",
        "static/src/js/mapfish/Util.js",
        "static/src/js/mapfish/Color.js",
        "static/src/js/mapfish/GeoStat.js",
        "static/src/js/mapfish/GeoStat/ProportionalSymbol.js",
        "static/src/js/mapfish/GeoStat/Choropleth.js",
        "static/src/js/geoengine.js"],
 'css': ["static/src/css/style.css",],
 'qweb' : ["static/src/xml/*.xml"],
 'installable': True,
 'active': False,
}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
