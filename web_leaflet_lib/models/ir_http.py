# Copyright (C) 2022 - Today: GRAP (http://www.grap.coop)
# @author: Sylvain LE GAL (https://twitter.com/legalsylvain)
# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import models


class Http(models.AbstractModel):
    _inherit = "ir.http"

    def session_info(self):
        result = super().session_info()
        config = self.env["ir.config_parameter"].sudo()
        result.update(
            {
                # Display configuration
                "leaflet.tile_url": config.get_param("leaflet.tile_url", default=""),
                "leaflet.copyright": config.get_param("leaflet.copyright", default=""),
                # Geocoding configuration
                "leaflet.geocoding_provider": config.get_param(
                    "leaflet.geocoding_provider", default="nominatim"
                ),
                "leaflet.nominatim_url": config.get_param(
                    "leaflet.nominatim_url",
                    default="https://nominatim.openstreetmap.org",
                ),
                "leaflet.geocoding_throttle_ms": int(
                    config.get_param("leaflet.geocoding_throttle_ms", default="1000")
                ),
                # Routing configuration
                "leaflet.routing_provider": config.get_param(
                    "leaflet.routing_provider", default="osrm"
                ),
                "leaflet.osrm_url": config.get_param(
                    "leaflet.osrm_url", default="https://router.project-osrm.org"
                ),
                "leaflet.max_waypoints": int(
                    config.get_param("leaflet.max_waypoints", default="25")
                ),
                # MapBox token (if configured)
                "leaflet.mapbox_token": config.get_param(
                    "leaflet.mapbox_token", default=""
                ),
            }
        )
        return result
