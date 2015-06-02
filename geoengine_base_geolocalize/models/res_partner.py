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

import logging
from openerp import api, fields
from openerp import exceptions
from openerp.tools.translate import _
from openerp.addons.base_geoengine import geo_model
from openerp.addons.base_geoengine import fields as geo_fields

try:
    import requests
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning('requests is not available in the sys path')

_logger = logging.getLogger(__name__)


class ResPartner(geo_model.GeoModel):
    """Add geo_point to partner using a function field"""
    _inherit = "res.partner"

    @api.one
    def geocode_address(self):
        """Get the latitude and longitude by requesting "mapquestapi"
        see http://open.mapquestapi.com/geocoding/
        """
        url = 'http://nominatim.openstreetmap.org/search'
        pay_load = {
            'limit': 1,
            'format': 'json',
            'street': self.street or '',
            'postalCode': self.zip or '',
            'city': self.city or '',
            'state':  self.state_id and self.state_id.name or '',
            'country': self.country_id and self.country_id.name or '',
            'countryCodes': self.country_id and self.country_id.code or ''}

        request_result = requests.get(url, params=pay_load)
        try:
            request_result.raise_for_status()
        except Exception as e:
            _logger.exception('Geocoding error')
            raise exceptions.Warning(_(
                'Geocoding error. \n %s') % e.message)
        vals = request_result.json()
        vals = vals and vals[0] or {}
        self.write({
            'partner_latitude': vals.get('lat'),
            'partner_longitude': vals.get('lon'),
            'date_localization': fields.Date.today()})

    @api.one
    def geo_localize(self):
        self.geocode_address()
        return True

    @api.one
    @api.depends('partner_latitude', 'partner_longitude')
    def _get_geo_point(self):
        """
        Set the `geo_point` of the partner depending of its `partner_latitude`
        and its `partner_longitude`
        **Notes**
        If one of those parameters is not set then reset the partner's
        geo_point and do not recompute it
        """
        if not self.partner_latitude or not self.partner_longitude:
            self.geo_point = False
        else:
            self.geo_point = geo_fields.GeoPoint.from_latlon(
                self.env.cr, self.partner_latitude, self.partner_longitude)

    geo_point = geo_fields.GeoPoint(
        readonly=True, store=True, compute='_get_geo_point')
