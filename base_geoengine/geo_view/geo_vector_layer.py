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
from openerp import fields, models

SUPPORTED_ATT = ['float', 'integer', 'integer_big', 'related',
                 'function', 'date', 'datetime', 'char', 'text', 'selection']


class GeoVectorLayer(models.Model):
    _name = 'geoengine.vector.layer'

    geo_repr = fields.Selection(
        [('basic', 'Basic'),
         # Actually we have to think if we should separate it for colored
         # ('choropleth', 'Choropleth'),
         ('proportion', 'Proportional Symbol'),
         ('colored', 'Colored range/Choropleth')],
        string="Representation mode",
        required=True)
    classification = fields.Selection(
        [('unique', 'Unique value'),
         ('interval', 'Interval'),
         ('quantile', 'Quantile')],
        string="Classification mode",
        required=False)
    name = fields.Char(
        'Layer Name', size=256, translate=True, required=True)
    symbol_url = fields.Text('Symbol URL')
    symbol_binary = fields.Binary('Binary Symbol')
    begin_color = fields.Char(
        'Begin color class', size=64, required=False, help='hex value')
    end_color = fields.Char(
        'End color class', size=64, required=False, help='hex value',
        default='#FF680A')
    nb_class = fields.Integer('Number of class', default=1)
    attribute_field_id = fields.Many2one(
        'ir.model.fields', 'attribute field',
        domain=[('ttype', 'in', SUPPORTED_ATT)])
    geo_field_id = fields.Many2one(
        'ir.model.fields', 'Geo field',
        domain=[('ttype', 'ilike', 'geo_')], required=True)
    view_id = fields.Many2one(
        'ir.ui.view', 'Related View', domain=[('type', '=', 'geoengine')],
        required=True)
    sequence = fields.Integer('layer priority lower on top', default=6)
    readonly = fields.Boolean('Layer is read only')
