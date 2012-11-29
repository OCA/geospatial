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

from base_geoengine import geo_model

class RetailMachine(geo_model.GeoModel):
    """GEO OSV SAMPLE"""

    _name = "geoengine.demo.automatic.retailing.machine"
    _columns = {'the_point' : fields.geo_point('Coordinate'),
                'the_line' : fields.geo_line('Power supply line'),
                'total_sales': fields.float('Total sale'),
                'money_level': fields.char('Money level', size=32),
                'state': fields.selection([('hs', 'HS'), ('ok', 'OK')],'State'),
                'name': fields.char('Serial number', size=64, required=True)}
RetailMachine()
