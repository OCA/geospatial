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
from tools.translate import _
import geo_model
class ResCompany(geo_model.GeoModel):
    """Override company to show basic GeoEngine data"""
    _name = "res.company"
    _inherit = "res.company"
    _columns = {
        # show the default
        'geoengine_base_info' : fields.text('General informations about GeoEngine',
                                             size=16, required=False, readonly=True),
        'comp_location' : fields.geo_point('Coordinate'),

    }
        
    _defaults = {'geoengine_base_info': lambda *a: 'NOT IMPLEMENTED YET'}
ResCompany()
