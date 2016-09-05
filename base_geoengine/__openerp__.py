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
 'version': '8.0.0.3.0',
 'category': 'GeoBI',
 'author': "Camptocamp,ACSONE SA/NV,Odoo Community Association (OCA)",
 'license': 'AGPL-3',
 'website': 'http://openerp.camptocamp.com',
 'depends': [
     'base',
     'web'
 ],
 'init_xml': [],
 'data': [
     'security/data.xml',
     'views/base_geoengine_view.xml',
     'geo_ir/ir_model_view.xml',
     'geo_view/ir_view_view.xml',
     'geo_view/geo_raster_layer_view.xml',
     'geo_view/geo_vector_layer_view.xml',
     'security/ir.model.access.csv',
 ],
 'external_dependencies': {
     'python': ['shapely',
                'geojson'],
 },
 'qweb': ["static/src/xml/geoengine.xml"],
 'installable': True,
 'active': False,
 'pre_init_hook': 'init_postgis',
 }
