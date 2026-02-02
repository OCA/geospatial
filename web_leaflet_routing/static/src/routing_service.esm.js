/** @odoo-module **/

/* global console, fetch, URLSearchParams */

import {session} from "@web/session";

/**
 * RoutingService provides routing functionality using OSRM or MapBox.
 * Default provider is OSRM (free, no API key required).
 */
export class RoutingService {
    constructor() {
        this.osrmUrl = session["leaflet.osrm_url"] || "https://router.project-osrm.org";
        this.mapboxToken = session["leaflet.mapbox_token"] || "";
        this.provider = session["leaflet.routing_provider"] || "osrm";
        this.maxWaypoints = session["leaflet.max_waypoints"] || 25;
    }

    /**
     * Get a route between waypoints.
     * @param {Array} waypoints - Array of [lat, lng] coordinate pairs
     * @param {String} profile - Routing profile (driving, walking, cycling)
     * @returns {Promise<Object|null>} Route object or null if failed
     */
    async getRoute(waypoints, profile = "driving") {
        if (waypoints.length < 2) {
            return null;
        }

        let routeWaypoints = waypoints;
        if (waypoints.length > this.maxWaypoints) {
            console.warn(
                `Too many waypoints (${waypoints.length}), truncating to ${this.maxWaypoints}`
            );
            routeWaypoints = waypoints.slice(0, this.maxWaypoints);
        }

        // Try MapBox first if configured
        if (
            this.provider === "mapbox" ||
            (this.provider === "auto" && this.mapboxToken)
        ) {
            const result = await this._getRouteMapBox(routeWaypoints, profile);
            if (result) {
                return result;
            }
            if (this.provider === "mapbox") {
                console.warn("MapBox routing failed, no fallback");
                return null;
            }
        }

        // Fallback to OSRM
        return this._getRouteOSRM(routeWaypoints, profile);
    }

    /**
     * Get route using OSRM.
     * @param {Array} waypoints
     * @param {String} profile
     * @returns {Promise<Object|null>}
     */
    async _getRouteOSRM(waypoints, profile = "driving") {
        // OSRM expects lng,lat order
        const coords = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(";");
        const url = `${this.osrmUrl}/route/v1/${profile}/${coords}`;

        const params = new URLSearchParams({
            overview: "full",
            geometries: "geojson",
            steps: "true",
        });

        try {
            const response = await fetch(`${url}?${params}`);
            const data = await response.json();

            if (data.code !== "Ok") {
                console.warn("OSRM routing failed:", data.message);
                return null;
            }

            const route = data.routes[0];

            // Convert GeoJSON coordinates from [lng, lat] to [lat, lng]
            const geometry = route.geometry.coordinates.map((coord) => [
                coord[1],
                coord[0],
            ]);

            return {
                geometry,
                distance: route.distance,
                duration: route.duration,
                legs: route.legs.map((leg) => ({
                    distance: leg.distance,
                    duration: leg.duration,
                    steps: (leg.steps || []).map((step) => ({
                        distance: step.distance,
                        duration: step.duration,
                        instruction: step.maneuver?.instruction || "",
                        name: step.name || "",
                    })),
                })),
                provider: "osrm",
            };
        } catch (error) {
            console.error("OSRM routing request failed:", error);
            return null;
        }
    }

    /**
     * Get route using MapBox Directions API.
     * @param {Array} waypoints
     * @param {String} profile
     * @returns {Promise<Object|null>}
     */
    async _getRouteMapBox(waypoints, profile = "driving") {
        if (!this.mapboxToken) {
            return null;
        }

        // Map profile names
        const profileMap = {
            driving: "driving",
            walking: "walking",
            cycling: "cycling",
        };
        const mapboxProfile = profileMap[profile] || "driving";

        // MapBox expects lng,lat order
        const coords = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(";");
        const url = `https://api.mapbox.com/directions/v5/mapbox/${mapboxProfile}/${coords}`;

        const params = new URLSearchParams({
            access_token: this.mapboxToken,
            overview: "full",
            geometries: "geojson",
            steps: "true",
        });

        try {
            const response = await fetch(`${url}?${params}`);
            const data = await response.json();

            if (data.code !== "Ok") {
                console.warn("MapBox routing failed:", data.message);
                return null;
            }

            const route = data.routes[0];

            // Convert GeoJSON coordinates from [lng, lat] to [lat, lng]
            const geometry = route.geometry.coordinates.map((coord) => [
                coord[1],
                coord[0],
            ]);

            return {
                geometry,
                distance: route.distance,
                duration: route.duration,
                legs: route.legs.map((leg) => ({
                    distance: leg.distance,
                    duration: leg.duration,
                    steps: (leg.steps || []).map((step) => ({
                        distance: step.distance,
                        duration: step.duration,
                        instruction: step.maneuver?.instruction || "",
                        name: step.name || "",
                    })),
                })),
                provider: "mapbox",
            };
        } catch (error) {
            console.error("MapBox routing request failed:", error);
            return null;
        }
    }

    /**
     * Get optimized route (TSP) visiting all waypoints.
     * @param {Array} waypoints - Array of [lat, lng] coordinate pairs
     * @param {String} profile - Routing profile
     * @param {Boolean} roundtrip - Return to starting point
     * @returns {Promise<Object|null>}
     */
    async getOptimizedRoute(waypoints, profile = "driving", roundtrip = false) {
        if (waypoints.length < 2) {
            return null;
        }

        // Try MapBox first if configured
        if (
            this.provider === "mapbox" ||
            (this.provider === "auto" && this.mapboxToken)
        ) {
            const result = await this._getOptimizedRouteMapBox(
                waypoints,
                profile,
                roundtrip
            );
            if (result) {
                return result;
            }
        }

        // Fallback to OSRM trip endpoint
        return this._getOptimizedRouteOSRM(waypoints, profile, roundtrip);
    }

    /**
     * Get optimized route using OSRM Trip API.
     * @param {Array} waypoints
     * @param {String} profile
     * @param {Boolean} roundtrip
     * @returns {Promise<Object|null>}
     */
    async _getOptimizedRouteOSRM(waypoints, profile = "driving", roundtrip = false) {
        // OSRM expects lng,lat order
        const coords = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(";");
        const url = `${this.osrmUrl}/trip/v1/${profile}/${coords}`;

        const params = new URLSearchParams({
            overview: "full",
            geometries: "geojson",
            steps: "true",
            roundtrip: roundtrip ? "true" : "false",
            source: "first",
            destination: "last",
        });

        try {
            const response = await fetch(`${url}?${params}`);
            const data = await response.json();

            if (data.code !== "Ok") {
                console.warn("OSRM trip failed:", data.message);
                return null;
            }

            const trip = data.trips[0];

            // Get waypoint ordering
            const waypointOrder = data.waypoints.map((wp) => wp.waypoint_index);

            // Convert GeoJSON coordinates from [lng, lat] to [lat, lng]
            const geometry = trip.geometry.coordinates.map((coord) => [
                coord[1],
                coord[0],
            ]);

            return {
                geometry,
                distance: trip.distance,
                duration: trip.duration,
                waypointOrder,
                optimizedWaypoints: waypointOrder.map((i) => waypoints[i]),
                provider: "osrm",
            };
        } catch (error) {
            console.error("OSRM trip request failed:", error);
            return null;
        }
    }

    /**
     * Get optimized route using MapBox Optimization API.
     * @param {Array} waypoints
     * @param {String} profile
     * @param {Boolean} roundtrip
     * @returns {Promise<Object|null>}
     */
    async _getOptimizedRouteMapBox(waypoints, profile = "driving", roundtrip = false) {
        if (!this.mapboxToken) {
            return null;
        }

        const profileMap = {
            driving: "driving",
            walking: "walking",
            cycling: "cycling",
        };
        const mapboxProfile = profileMap[profile] || "driving";

        // MapBox expects lng,lat order
        const coords = waypoints.map((wp) => `${wp[1]},${wp[0]}`).join(";");
        const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/${mapboxProfile}/${coords}`;

        const params = new URLSearchParams({
            access_token: this.mapboxToken,
            overview: "full",
            geometries: "geojson",
            steps: "true",
            roundtrip: roundtrip ? "true" : "false",
            source: "first",
            destination: "last",
        });

        try {
            const response = await fetch(`${url}?${params}`);
            const data = await response.json();

            if (data.code !== "Ok") {
                console.warn("MapBox optimization failed:", data.message);
                return null;
            }

            const trip = data.trips[0];

            // Get waypoint ordering
            const waypointOrder = data.waypoints.map((wp) => wp.waypoint_index);

            // Convert GeoJSON coordinates from [lng, lat] to [lat, lng]
            const geometry = trip.geometry.coordinates.map((coord) => [
                coord[1],
                coord[0],
            ]);

            return {
                geometry,
                distance: trip.distance,
                duration: trip.duration,
                waypointOrder,
                optimizedWaypoints: waypointOrder.map((i) => waypoints[i]),
                provider: "mapbox",
            };
        } catch (error) {
            console.error("MapBox optimization request failed:", error);
            return null;
        }
    }

    /**
     * Format distance for display.
     * @param {Number} meters
     * @returns {String}
     */
    formatDistance(meters) {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${Math.round(meters)} m`;
    }

    /**
     * Format duration for display.
     * @param {Number} seconds
     * @returns {String}
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes} min`;
    }
}

// Export singleton instance
export const routingService = new RoutingService();
