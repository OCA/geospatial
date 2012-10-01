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
{'name': 'Geo spatial support for OpenERP',
 'version': '0.1',
 'category': 'GeoBI',
 'description': """
     Geo spatial sample module for geospatial use
 """,
 'author': 'Camptocamp',
 'license': 'AGPL-3',
 'website': 'http://openerp.camptocamp.com',
 'depends': ['base_geoengine'],
 'init_xml': [],
 'update_xml': ['zip_view.xml',
                'retail_machine_view.xml',
                'data/retail_machine_geom.xml',
                'data/npa_geom.xml',
                'security/ir.model.access.csv'],
 'demo_xml': [],
 'installable': True,
 'active': False,
 'application': True,
 'icon': '/base_geoengine/static/src/images/map_icon.png'}
# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
