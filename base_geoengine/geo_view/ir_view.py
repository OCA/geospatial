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
from openerp import api


GEO_VIEW = ('geoengine', 'GeoEngine')


class IrUIView(models.Model):
    _inherit = 'ir.ui.view'

    @api.model
    def _setup_fields(self):
        """Hack due since the field 'type' is not defined with the new api.
        """
        cls = type(self)
        type_selection = cls._fields['type'].selection
        if GEO_VIEW not in type_selection:
            tmp = list(type_selection)
            tmp.append(GEO_VIEW)
            cls._fields['type'].selection = tuple(set(tmp))
        super(IrUIView, self)._setup_fields()

    raster_layer_ids = fields.One2many(
        'geoengine.raster.layer', 'view_id', 'Raster layers', required=False)

    vector_layer_ids = fields.One2many(
        'geoengine.vector.layer', 'view_id', 'Vector layers', required=True)

    default_extent = fields.Char(
        'Default map extent in 900913', size=128,
        default='-123164.85222423, 5574694.9538936, 1578017.6490538,'
        ' 6186191.1800898')
