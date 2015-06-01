# -*- coding: utf-8 -*-
##############################################################################
#
#   Author: Laurent Mignon
#   Copyright (c) 2015 Acsone SA/NV (http://www.acsone.eu)
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

from openerp import api

from openerp.addons.base_geoengine import geo_model
from openerp.addons.base_geoengine import fields


class ResPartner(geo_model.GeoModel):
    """Add geo_point to partner using a function field"""
    _inherit = "res.partner"

    @api.one
    @api.depends('partner_latitude', 'partner_longitude')
    def _get_geo_point(self):
        if not self.partner_latitude or not self.partner_longitude:
            self.geo_point = False
        self.geo_point = fields.GeoPoint.from_latlon(
            self.env.cr, self.partner_latitude, self.partner_longitude)

    geo_point = fields.GeoPoint(
        readonly=True, store=True, compute='_get_geo_point')
