# -*- coding: utf-8 -*-
# Copyright 2017 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).

import logging
import requests

from odoo import api, exceptions, models, _

_logger = logging.getLogger(__name__)


class GeoengineGeolocalizeOpenStreetmap(models.AbstractModel):

    _name = 'geoengine.geolocalize.openstreetmap'
    _url = 'http://nominatim.openstreetmap.org/search'

    @api.model
    def _geocode_address(
            self, street, zip_code, city, state, country_name,
            country_codes):
        """Get the latitude and longitude by requesting "mapquestapi"
        see http://open.mapquestapi.com/geocoding/
        """
        pay_load = {
            'limit': 1,
            'format': 'json',
            'street': street or '',
            'postalCode': zip_code,
            'city': city,
            'state':  state,
            'country': country_name,
            'countryCodes': country_codes,
        }

        request_result = requests.get(self._url, params=pay_load)
        try:
            request_result.raise_for_status()
        except Exception as e:
            _logger.exception('Geocoding error')
            raise exceptions.Warning(
                _('Geocoding error. \n %s') % e.message)
        values = request_result.json()
        values = values and values[0] or {}
        return values
