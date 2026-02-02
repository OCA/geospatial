# Copyright (C) 2019, Open Source Integrators
# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl).

import logging

from odoo import api, fields, models

_logger = logging.getLogger(__name__)


class ResPartner(models.Model):
    _inherit = "res.partner"

    display_address = fields.Char(compute="_compute_display_address")

    # Flag to enable/disable auto-geocoding per partner
    auto_geocode = fields.Boolean(
        string="Auto-geocode Address",
        default=True,
        help="Automatically update coordinates when address changes.",
    )

    # Geocoding metadata
    geocoding_date = fields.Datetime(
        string="Last Geocoding",
        readonly=True,
        help="Date when coordinates were last updated via geocoding.",
    )
    geocoding_provider = fields.Char(
        readonly=True,
        help="Provider used for the last geocoding (nominatim, mapbox).",
    )

    def _compute_display_address(self):
        for partner in self:
            partner.display_address = partner._display_address(without_company=True)

    @api.model
    def _get_geocoding_fields(self):
        """
        Return the list of address fields that trigger auto-geocoding.
        """
        return ["street", "street2", "city", "zip", "state_id", "country_id"]

    def write(self, vals):
        """
        Override write to trigger auto-geocoding when address changes.
        """
        result = super().write(vals)

        # Check if any geocoding-triggering field was modified
        geocoding_fields = self._get_geocoding_fields()
        if any(field in vals for field in geocoding_fields):
            # Auto-geocode partners that have the flag enabled
            partners_to_geocode = self.filtered(
                lambda p: p.auto_geocode and not p.partner_latitude
            )
            if partners_to_geocode:
                partners_to_geocode._auto_geocode_address()

        return result

    @api.model_create_multi
    def create(self, vals_list):
        """
        Override create to trigger auto-geocoding for new partners with address.
        """
        partners = super().create(vals_list)

        # Auto-geocode partners with address but no coordinates
        geocoding_fields = self._get_geocoding_fields()
        for partner, vals in zip(partners, vals_list, strict=False):
            if (
                partner.auto_geocode
                and any(vals.get(field) for field in geocoding_fields)
                and not partner.partner_latitude
            ):
                partner._auto_geocode_address()

        return partners

    def _auto_geocode_address(self):
        """
        Automatically geocode the partner's address.

        Uses the leaflet.geocoding.mixin if available.
        Rate-limited to respect Nominatim's 1 req/sec requirement.
        """
        GeocodingMixin = self.env.get("leaflet.geocoding.mixin")
        if not GeocodingMixin:
            _logger.warning(
                "Geocoding mixin not available. "
                "Install web_leaflet_lib for auto-geocoding."
            )
            return

        for partner in self:
            # Build address string
            address = partner._build_geocoding_address()
            if not address:
                continue

            # Get country code for better geocoding results
            country_code = None
            if partner.country_id:
                country_code = partner.country_id.code

            try:
                result = GeocodingMixin.geocode_address(address, country_code)

                if result:
                    partner.write(
                        {
                            "partner_latitude": result["lat"],
                            "partner_longitude": result["lng"],
                            "geocoding_date": fields.Datetime.now(),
                            "geocoding_provider": result.get("provider", "unknown"),
                        }
                    )
                    _logger.info(
                        "Auto-geocoded partner %s: %s -> (%s, %s)",
                        partner.id,
                        address,
                        result["lat"],
                        result["lng"],
                    )
                else:
                    _logger.warning(
                        "Failed to geocode partner %s: %s",
                        partner.id,
                        address,
                    )
            except Exception as e:
                _logger.error(
                    "Error geocoding partner %s: %s",
                    partner.id,
                    e,
                )

    def _build_geocoding_address(self):
        """
        Build address string for geocoding from partner fields.

        Returns:
            str: Formatted address string
        """
        self.ensure_one()

        parts = []

        if self.street:
            parts.append(self.street)
        if self.street2:
            parts.append(self.street2)
        if self.city:
            parts.append(self.city)
        if self.state_id:
            parts.append(self.state_id.name)
        if self.zip:
            parts.append(self.zip)
        if self.country_id:
            parts.append(self.country_id.name)

        return ", ".join(parts)

    def action_geocode_address(self):
        """
        Manual action to geocode the partner's address.
        """
        self._auto_geocode_address()
        return True

    def action_clear_coordinates(self):
        """
        Clear the partner's coordinates.
        """
        self.write(
            {
                "partner_latitude": 0.0,
                "partner_longitude": 0.0,
                "geocoding_date": False,
                "geocoding_provider": False,
            }
        )
        return True

    def action_open_in_map(self):
        """
        Open the partner's location on a map.
        """
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "name": f"Location: {self.display_name}",
            "res_model": "res.partner",
            "view_mode": "leaflet_map",
            "domain": [("id", "=", self.id)],
        }
