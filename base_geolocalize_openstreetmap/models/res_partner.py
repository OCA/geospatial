# Copyright 2017 ACSONE SA/NV (<http://acsone.eu>)
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl.html).

import logging
import requests

from odoo import exceptions, models, _

_logger = logging.getLogger(__name__)


class ResPartner(models.AbstractModel):

    _url = "https://nominatim.openstreetmap.org/search"
    _inherit = "res.partner"

    @classmethod
    def _geocode_address(
        cls, street=None, zip_code=None, city=None, state=None, country=None
    ):
        """Get the latitude and longitude by requesting Openstreetmap" """
        pay_load = {
            "limit": 1,
            "format": "json",
            "street": street or "",
            "postalCode": zip_code or "",
            "city": city or "",
            "state": state or "",
            "country": country or "",
        }

        request_result = requests.get(cls._url, params=pay_load)
        try:
            request_result.raise_for_status()
        except Exception as e:
            _logger.exception("Geocoding error")
            raise exceptions.Warning(_("Geocoding error. \n %s") % e.message)
        values = request_result.json()
        values = values[0] if values else {}
        return values

    @classmethod
    def _geo_localize(
        cls, apikey, street="", zip="", city="", state="", country=""
    ):
        # pylint: disable=W0622
        result = cls._geocode_address(
            street=street,
            zip_code=zip,
            city=city,
            state=state,
            country=country,
        )

        if not result:
            result = cls._geocode_address(
                city=city, state=state, country=country
            )

        return result.get("lat"), result.get("lon")
