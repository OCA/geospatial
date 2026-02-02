# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

from odoo import fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = "res.config.settings"

    # Geocoding Configuration
    leaflet_geocoding_provider = fields.Selection(
        selection=[
            ("nominatim", "Nominatim (OSM) - Free"),
            ("mapbox", "MapBox - Premium"),
            ("auto", "Auto (MapBox with Nominatim fallback)"),
        ],
        string="Geocoding Provider",
        default="nominatim",
        config_parameter="leaflet.geocoding_provider",
        help="Provider for address-to-coordinates conversion.\n"
        "Nominatim is free but limited to 1 request/second.\n"
        "MapBox requires an API token but has higher limits.",
    )

    leaflet_mapbox_token = fields.Char(
        string="MapBox Access Token",
        config_parameter="leaflet.mapbox_token",
        help="Your MapBox public access token for geocoding and routing.\n"
        "Get one at https://account.mapbox.com/access-tokens/",
    )

    leaflet_nominatim_url = fields.Char(
        string="Nominatim Server URL",
        default="https://nominatim.openstreetmap.org",
        config_parameter="leaflet.nominatim_url",
        help="Nominatim server URL. Use default for OSM public server\n"
        "or specify your own self-hosted instance.",
    )

    # Routing Configuration
    leaflet_routing_provider = fields.Selection(
        selection=[
            ("osrm", "OSRM - Free"),
            ("mapbox", "MapBox - Premium"),
            ("auto", "Auto (MapBox with OSRM fallback)"),
        ],
        string="Routing Provider",
        default="osrm",
        config_parameter="leaflet.routing_provider",
        help="Provider for route calculation and directions.\n"
        "OSRM is free and can be self-hosted.\n"
        "MapBox requires an API token.",
    )

    leaflet_osrm_url = fields.Char(
        string="OSRM Server URL",
        default="https://router.project-osrm.org",
        config_parameter="leaflet.osrm_url",
        help="OSRM routing server URL. Use default for public server\n"
        "or specify your own self-hosted instance for production use.",
    )

    # Tile Configuration
    leaflet_tile_url = fields.Char(
        string="Tile Server URL",
        config_parameter="leaflet.tile_url",
        help="Custom map tile server URL. Leave empty for default OSM tiles.\n"
        "Example: https://api.mapbox.com/styles/v1/{username}/{style_id}/tiles/{z}/{x}/{y}",
    )

    leaflet_copyright = fields.Char(
        string="Map Copyright",
        config_parameter="leaflet.copyright",
        help="Copyright attribution for the map tiles.",
    )

    # Performance Settings
    leaflet_geocoding_throttle_ms = fields.Integer(
        string="Geocoding Throttle (ms)",
        default=1000,
        config_parameter="leaflet.geocoding_throttle_ms",
        help="Minimum delay between geocoding requests in milliseconds.\n"
        "Default: 1000ms (required for OSM Nominatim).",
    )

    leaflet_max_waypoints = fields.Integer(
        string="Max Routing Waypoints",
        default=25,
        config_parameter="leaflet.max_waypoints",
        help="Maximum number of waypoints for routing requests.\n"
        "OSRM and MapBox limit: 25 waypoints.",
    )
