# Copyright (C) 2025 KMEE (https://kmee.com.br)
# License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).

import logging

from odoo import api, models

from odoo.addons.web_leaflet_lib.models.routing_service import RoutingServiceFactory

_logger = logging.getLogger(__name__)


class RoutingMixin(models.AbstractModel):
    """Mixin providing routing capabilities using OSRM or MapBox."""

    _name = "leaflet.routing.mixin"
    _description = "Leaflet Routing Mixin"

    @api.model
    def _get_routing_factory(self):
        """Get the routing service factory."""
        return RoutingServiceFactory(self.env)

    @api.model
    def _get_routing_provider(self):
        """Get the configured routing provider."""
        return self._get_routing_factory().get_routing_provider()

    @api.model
    def _get_osrm_url(self):
        """Get OSRM server URL."""
        return self._get_routing_factory().get_osrm_url()

    @api.model
    def _get_mapbox_token(self):
        """Get MapBox API token if configured."""
        return self._get_routing_factory().get_mapbox_token()

    @api.model
    def _get_max_waypoints(self):
        """Get maximum waypoints for routing."""
        return self._get_routing_factory().get_max_waypoints()

    @api.model
    def _get_routing_service(self, provider=None, profile="driving"):
        """Get routing service instance."""
        return self._get_routing_factory().get_service(provider, profile)

    @api.model
    def get_route(self, waypoints, profile="driving"):
        """
        Get a route between waypoints.

        Args:
            waypoints: List of [lat, lng] coordinate pairs
            profile: Routing profile (driving, walking, cycling)

        Returns:
            dict with:
                - geometry: List of [lat, lng] coordinates for polyline
                - distance: Total distance in meters
                - duration: Total duration in seconds
                - legs: Route segments between waypoints
        """
        if len(waypoints) < 2:
            return None

        factory = self._get_routing_factory()
        provider = factory.get_routing_provider()
        mapbox_token = factory.get_mapbox_token()
        max_waypoints = factory.get_max_waypoints()

        if len(waypoints) > max_waypoints:
            _logger.warning(
                "Too many waypoints (%d), truncating to %d",
                len(waypoints),
                max_waypoints,
            )
            waypoints = waypoints[:max_waypoints]

        # Try MapBox first if configured
        if provider == "mapbox" or (provider == "auto" and mapbox_token):
            mapbox_service = factory.get_mapbox_service(profile)
            if mapbox_service:
                result = mapbox_service.get_route(waypoints)
                if result:
                    return result
            if provider == "mapbox":
                _logger.warning("MapBox routing failed, no fallback configured")
                return None

        # Fallback to OSRM
        osrm_service = factory.get_osrm_service(profile)
        return osrm_service.get_route(waypoints)

    @api.model
    def get_optimized_route(self, waypoints, profile="driving", roundtrip=False):
        """
        Get an optimized route visiting all waypoints (TSP).

        Args:
            waypoints: List of [lat, lng] coordinate pairs
            profile: Routing profile
            roundtrip: Whether to return to the starting point

        Returns:
            dict with optimized route and waypoint ordering
        """
        if len(waypoints) < 2:
            return None

        factory = self._get_routing_factory()
        provider = factory.get_routing_provider()
        mapbox_token = factory.get_mapbox_token()

        # Try MapBox first if configured (has optimization API)
        if provider == "mapbox" or (provider == "auto" and mapbox_token):
            mapbox_service = factory.get_mapbox_service(profile)
            if mapbox_service:
                result = mapbox_service.get_optimized_route(
                    waypoints, roundtrip=roundtrip
                )
                if result:
                    return result

        # Fallback to OSRM trip endpoint
        osrm_service = factory.get_osrm_service(profile)
        return osrm_service.get_optimized_route(waypoints, roundtrip=roundtrip)

    @api.model
    def get_distance_matrix(self, origins, destinations=None):
        """
        Get distance matrix between origins and destinations.

        Args:
            origins: List of [lat, lng] coordinate pairs
            destinations: List of [lat, lng] pairs (defaults to origins)

        Returns:
            dict with:
                - distances: 2D list of distances in meters
                - durations: 2D list of durations in seconds
        """
        factory = self._get_routing_factory()
        return factory.get_distance_matrix(origins, destinations)
