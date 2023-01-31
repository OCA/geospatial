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

from openerp import fields
from . import geo_model
from . import fields as geo_fields


class ResCompany(geo_model.GeoModel):
    """Override company to show basic GeoEngine data"""
    _name = "res.company"
    _inherit = "res.company"

    geoengine_base_info = fields.Text(
        'General informations about GeoEngine', size=16, required=False,
        readonly=True, default='NOT IMPLEMENTED YET')
    comp_location = geo_fields.GeoPoint('Coordinate')
