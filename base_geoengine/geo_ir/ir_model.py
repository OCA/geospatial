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
from openerp.addons import base
if 'geoengine' not in base.ir.ir_actions.VIEW_TYPES:
    base.ir.ir_actions.VIEW_TYPES.append(('geoengine', 'Geoengine'))

GEO_TYPES = [('geo_polygon', 'geo_polygon'),
             ('geo_multi_polygon', 'geo_multi_polygon'),
             ('geo_point', 'geo_point'),
             ('geo_multi_point', 'geo_multi_point'),
             ('geo_line', 'geo_line'),
             ('geo_multi_line', 'geo_multi_line')]

POSTGIS_GEO_TYPES = [('POINT', 'POINT'),
                     ('MULTIPOINT', 'MULTIPOINT'),
                     ('LINESTRING', 'LINESTRING'),
                     ('MULTILINESTRING', 'MULTILINESTRING'),
                     ('POLYGON', 'POLYGON'),
                     ('MULTIPOLYGON', 'MULTIPOLYGON')]


class IrModelField(models.Model):
    _inherit = 'ir.model.fields'

    def _get_fields_type(self, cr, uid, context=None):
        cr.execute('select distinct ttype,ttype from ir_model_fields')
        res = cr.fetchall()
        to_return = list(set(res+GEO_TYPES))
        to_return.sort()
        return to_return

    srid = fields.Integer(
        'srid',
        required=False
    )
    geo_type = fields.Selection(
        POSTGIS_GEO_TYPES,
        string="PostGIs type"
    )
    dim = fields.Selection(
        [(2, '2'), (3, '3'), (4, '4')],
        string="PostGIs type"
    )
    gist_index = fields.Boolean(
        'Create gist index'
    )
    ttype = fields.Selection(
        '_get_fields_type',
        'Field Type',
        size=64,
        required=True
    )
