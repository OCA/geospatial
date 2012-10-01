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
from osv import fields, osv

SUPPORTED_ATT = ['float', 'integer','integer_big', 'related',
                 'function', 'date', 'datetime', 'char', 'text', 'selection']

class GeoVectorLayer(osv.osv):
    _name = 'geoengine.vector.layer'


    _columns = {'geo_repr': fields.selection([('basic', 'Basic'),
                                              # Actually we have to think if we should separate it for colored
                                              #('choropleth', 'Choropleth'),
                                              ('proportion', 'Proportional Symbol'),
                                              ('colored', 'Colored range/Choropleth')],
                                             string="Representation mode",
                                             required=True),
                'classification': fields.selection([('unique', 'Unique value'),
                                                    ('interval', 'Interval'),
                                                    ('quantile', 'Quantile')],
                                             string="Classification mode",
                                             required=False),
                'name': fields.char('Layer Name', size=256, translate=True, required=True),
                'symbol_url': fields.text('Symbol URL'),
                'symbol_binary': fields.binary('Binary Symbol'),
                'begin_color': fields.char('Begin color class', size=64, required=False,
                                           help='hex value'),
                'end_color': fields.char('End color class', size=64, required=False,
                                         help='hex value'),
                'nb_class': fields.integer('Number of class'),
                'attribute_field_id': fields.many2one('ir.model.fields',
                                                      'attribute field',
                                                      domain=[('ttype', 'in', SUPPORTED_ATT)]),
                'geo_field_id': fields.many2one('ir.model.fields',
                                                'Geo field',
                                                domain=[('ttype', 'ilike', 'geo_')],
                                                required=True),
                'view_id' : fields.many2one('ir.ui.view', 'Related View',
                                            domain=[('type', '=', 'geoengine')],
                                            required=True),
                'sequence': fields.integer('layer priority lower on top'),
                'readonly': fields.boolean('Layer is read only')}
    # TODO Write data check consraints
    _defaults = {'nb_class': lambda *a: 1,
                 'begin_color': lambda *a: '#FF680A',
                 'sequence': lambda *a: 6}

GeoVectorLayer()
