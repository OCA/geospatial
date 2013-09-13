# -*- coding: utf-8 -*-
##############################################################################
#
#    Author: Nicolas Bessi
#    Copyright 2011-2012 Camptocamp SA
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Affero General Public License as
#    published by the Free Software Foundation, either version 3 of the
#    License, or (at your option) any later version.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Affero General Public License for more details.
#
#    You should have received a copy of the GNU Affero General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
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
 'license': 'AGPL-3',
 'website': 'http://openerp.camptocamp.com',
 'depends': ['base', 'web'],
 'init_xml': [],
 'update_xml': ['data.xml',
                'company_view.xml',
                'geo_ir/ir_model_view.xml',
                'geo_view/ir_view_view.xml',
                'geo_view/geo_raster_layer_view.xml',
                'geo_view/geo_vector_layer_view.xml',
                'security/ir.model.access.csv'],
 'demo_xml': [],
 'js': ["static/src/js/lib/OpenLayers.js",
        "static/src/js/lib/proj4js-compressed.js",
        "static/src/js/lib/EPSG21781.js",
        "static/src/js/mapfish/namespaces.js",
        "static/src/js/mapfish/Util.js",
        "static/src/js/mapfish/Color.js",
        "static/src/js/mapfish/GeoStat.js",
        "static/src/js/mapfish/GeoStat/ProportionalSymbol.js",
        "static/src/js/mapfish/GeoStat/Choropleth.js",
        "static/src/js/geoengine_view.js",
        "static/src/js/geoengine_edit_widget.js"],
 'css': ["static/src/css/style.css",],
 'qweb' : ["static/src/xml/*.xml"],
 'installable': True,
 'active': False,
 'icon': '/base_geoengine/static/src/images/map_icon.png'}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
