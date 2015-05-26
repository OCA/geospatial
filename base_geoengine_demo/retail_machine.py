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
from openerp.addons.base_geoengine import geo_model
from openerp.addons.base_geoengine import fields as geo_fields


class RetailMachine(geo_model.GeoModel):
    """GEO OSV SAMPLE"""

    _name = "geoengine.demo.automatic.retailing.machine"

    the_point = geo_fields.GeoPoint('Coordinate')
    the_line = geo_fields.GeoLine('Power supply line', index=True)
    total_sales = fields.Float('Total sale', index=True)
    money_level = fields.Char('Money level', size=32, index=True)
    state = fields.Selection([('hs', 'HS'),
                              ('ok', 'OK')],
                             'State',
                             index=True)
    name = fields.Char('Serial number', size=64, required=True)
