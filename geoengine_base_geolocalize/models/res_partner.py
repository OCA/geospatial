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
from odoo import api, fields
from odoo import exceptions
from odoo.tools.translate import _
from odoo.addons.base_geoengine import geo_model
from odoo.addons.base_geoengine import fields as geo_fields

try:
    import requests
except ImportError:
    logger = logging.getLogger(__name__)
    logger.warning('requests is not available in the sys path')

_logger = logging.getLogger(__name__)


class ResPartner(geo_model.GeoModel):
    """Add geo_point to partner using a function field"""
    _inherit = "res.partner"

    @api.multi
    def geocode_address(self):
        """Get the latitude and longitude by requesting the "Nominatim"
        search engine from "openstreetmap". See:
        https://nominatim.org/release-docs/latest/api/Overview/
        """
        url = 'http://nominatim.openstreetmap.org/search'
        headers = {'User-Agent': 'Odoobot/11.0.1.0.0 (OCA-geospatial)'}

        for partner in self:
            pay_load = {
                'limit': 1,
                'format': 'json',
                'street': partner.street or '',
                'postalCode': partner.zip or '',
                'city': partner.city or '',
                'state':  partner.state_id and partner.state_id.name or '',
                'country': partner.country_id and partner.country_id.name or '',
                'countryCodes': partner.country_id and partner.country_id.code or ''}

            request_result = requests.get(url, params=pay_load, headers=headers)
            try:
                request_result.raise_for_status()
            except Exception as e:
                _logger.exception('Geocoding error')
                raise exceptions.Warning(_('Geocoding error. \n %s') % e.message)
            vals = request_result.json()
            vals = vals and vals[0] or {}
            partner.write({
                'partner_latitude': vals.get('lat'),
                'partner_longitude': vals.get('lon'),
                'date_localization': fields.Date.today()})

    @api.multi
    def geo_localize(self):
        self.geocode_address()
        return True

    @api.multi
    @api.depends('partner_latitude', 'partner_longitude')
    def _get_geo_point(self):
        """
        Set the `geo_point` of the partner depending of its `partner_latitude`
        and its `partner_longitude`
        **Notes**
        If one of those parameters is not set then reset the partner's
        geo_point and do not recompute it
        """
        for partner in self:
            if not partner.partner_latitude or not partner.partner_longitude:
                partner.geo_point = False
            else:
                partner.geo_point = geo_fields.GeoPoint.from_latlon(
                    partner.env.cr, partner.partner_latitude, partner.partner_longitude)

    geo_point = geo_fields.GeoPoint(
        readonly=True, store=True, compute='_get_geo_point')
