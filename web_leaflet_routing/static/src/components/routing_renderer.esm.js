/** @odoo-module **/
/*
 * Copyright (C) 2025 KMEE (https://kmee.com.br)
 * @author Luis Felipe Mileo <mileo@kmee.com.br>
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
 */

/* global L, console */

import {RoutingService} from "../routing_service.esm";

/**
 * RoutingRenderer provides generic route visualization functionality.
 * Can be used standalone or integrated with LeafletMapRenderer subclasses.
 *
 * Features:
 * - OSRM/MapBox routing via RoutingService
 * - Grouping support for multiple routes
 * - Fallback to dashed polylines when routing fails
 * - Configurable colors and options
 */
export class RoutingRenderer {
    /**
     * Create a new RoutingRenderer.
     * @param {L.Map} map - The Leaflet map instance
     * @param {RoutingService} routingService - Optional routing service instance
     */
    constructor(map, routingService = null) {
        this.map = map;
        this.routingService = routingService || new RoutingService();
        this.routeLayerGroup = L.layerGroup();
        this.routeLayerGroup.addTo(this.map);
    }

    /**
     * Render routes on the map based on records.
     * @param {Array} records - Array of record objects with coordinates
     * @param {Object} config - Configuration options
     * @param {String} config.groupBy - Field name to group records by
     * @param {String} config.sequenceField - Field name for sequencing (default: "sequence")
     * @param {String} config.stopTypeField - Field name for stop type (default: null)
     * @param {String} config.stopTypeOrderField - Field name for stop type order (default: null)
     * @param {String} config.latitudeField - Field name for latitude (default: "latitude")
     * @param {String} config.longitudeField - Field name for longitude (default: "longitude")
     * @param {Boolean} config.useRealRouting - Use OSRM routing (default: true)
     * @param {Array} config.colors - Array of colors for routes
     * @param {Boolean} config.skipUnassigned - Skip unassigned groups (default: false)
     * @param {String} config.unassignedGroupName - Name for unassigned group (default: "Unassigned")
     * @param {Function} config.validateCoordinates - Custom coordinate validator
     */
    async renderRoutes(records, config = {}) {
        const {
            groupBy = null,
            sequenceField = "sequence",
            stopTypeField = null,
            stopTypeOrderField = "stop_type_order",
            latitudeField = "latitude",
            longitudeField = "longitude",
            useRealRouting = true,
            colors = ["#007bff", "#28a745", "#dc3545", "#ffc107", "#17a2b8", "#6f42c1"],
            skipUnassigned = false,
            unassignedGroupName = "Unassigned",
            validateCoordinates = this._defaultValidateCoordinates.bind(this),
        } = config;

        this.routeLayerGroup.clearLayers();

        // Group records
        const groups = this._groupRecords(records, {
            groupBy,
            latitudeField,
            longitudeField,
            sequenceField,
            stopTypeField,
            stopTypeOrderField,
            unassignedGroupName,
            validateCoordinates,
        });

        let colorIndex = 0;
        for (const groupKey of Object.keys(groups)) {
            const group = groups[groupKey];

            // Skip unassigned groups if configured
            if (skipUnassigned && group.isUnassigned) {
                continue;
            }

            // Sort records by stop_type_order (0=origin, 1=delivery, 2=destination) then by sequence
            const sorted = [...group.records].sort((a, b) => {
                // Primary sort by stopTypeOrder (already computed as number in _groupRecords)
                if (a.stopTypeOrder !== b.stopTypeOrder) {
                    return a.stopTypeOrder - b.stopTypeOrder;
                }
                // Secondary sort by sequence
                return (a.sequence || 0) - (b.sequence || 0);
            });

            // Debug logging for route order
            console.debug(
                `[RoutingRenderer] Group ${groupKey} route order (${sorted.length} stops):`,
                sorted.map((r) => ({
                    stopType: r.stopType,
                    stopTypeOrder: r.stopTypeOrder,
                    sequence: r.sequence,
                }))
            );

            const waypoints = sorted.map((r) => [r.lat, r.lng]);

            if (waypoints.length < 2) {
                continue;
            }

            const color = colors[colorIndex % colors.length];
            await this._drawRoute(waypoints, color, useRealRouting);
            colorIndex++;
        }
    }

    /**
     * Draw a single route on the map.
     * @param {Array} waypoints - Array of [lat, lng] pairs
     * @param {String} color - Route color
     * @param {Boolean} useRealRouting - Use OSRM routing
     */
    async _drawRoute(waypoints, color, useRealRouting) {
        if (useRealRouting) {
            try {
                const route = await this.routingService.getRoute(waypoints);
                if (route && route.geometry) {
                    const polyline = L.polyline(route.geometry, {
                        color,
                        weight: 4,
                        opacity: 0.8,
                    });

                    // Add tooltip with distance and duration
                    const distKm = (route.distance / 1000).toFixed(1);
                    const durMin = Math.round(route.duration / 60);
                    polyline.bindTooltip(`${distKm} km \u2022 ${durMin} min`, {
                        sticky: true,
                    });

                    this.routeLayerGroup.addLayer(polyline);
                    return;
                }
            } catch (e) {
                console.warn("OSRM routing failed, using fallback", e);
            }
        }

        // Fallback: dashed polyline
        const polyline = L.polyline(waypoints, {
            color,
            weight: 3,
            opacity: 0.7,
            dashArray: "10, 10",
        });
        this.routeLayerGroup.addLayer(polyline);
    }

    /**
     * Group records for routing.
     * @param {Array} records - Array of record objects
     * @param {Object} options - Grouping options
     * @returns {Object} Groups object keyed by group name
     */
    _groupRecords(records, options) {
        const {
            groupBy,
            latitudeField,
            longitudeField,
            sequenceField,
            stopTypeField,
            stopTypeOrderField,
            unassignedGroupName,
            validateCoordinates,
        } = options;

        const groups = {};

        for (const record of records) {
            const lat = record[latitudeField];
            const lng = record[longitudeField];

            if (!validateCoordinates(lat, lng)) {
                continue;
            }

            let groupKey = unassignedGroupName;
            let isUnassigned = true;

            if (groupBy && record[groupBy]) {
                const val = record[groupBy];
                // Handle Many2one fields (array with [id, name])
                groupKey = Array.isArray(val) ? String(val[0]) : String(val);
                isUnassigned = false;
            }

            if (!groups[groupKey]) {
                groups[groupKey] = {
                    records: [],
                    isUnassigned,
                };
            }

            // Extract stop type order - handle 0 as valid value
            // First try the explicit stopTypeOrderField
            let stopTypeOrderValue = 1; // Default to delivery
            if (
                stopTypeOrderField &&
                record[stopTypeOrderField] !== undefined &&
                record[stopTypeOrderField] !== null
            ) {
                stopTypeOrderValue = Number(record[stopTypeOrderField]);
                if (isNaN(stopTypeOrderValue)) {
                    stopTypeOrderValue = 1;
                }
            } else if (stopTypeField) {
                // Fallback: derive from stop_type field
                const stopType = record[stopTypeField];
                if (stopType === "origin") {
                    stopTypeOrderValue = 0;
                } else if (stopType === "destination") {
                    stopTypeOrderValue = 2;
                }
            }

            const stopTypeValue = stopTypeField ? record[stopTypeField] : null;

            // Debug: log raw field values
            console.debug(`[RoutingRenderer] Record ${record.id}:`, {
                stopType: stopTypeValue,
                rawStopTypeOrder: record[stopTypeOrderField],
                computedStopTypeOrder: stopTypeOrderValue,
                sequence: record[sequenceField],
            });

            groups[groupKey].records.push({
                lat,
                lng,
                sequence: record[sequenceField] || 0,
                stopType: stopTypeValue,
                stopTypeOrder: stopTypeOrderValue,
                record,
            });
        }

        return groups;
    }

    /**
     * Default coordinate validator.
     * @param {Number} lat - Latitude
     * @param {Number} lng - Longitude
     * @returns {Boolean}
     */
    _defaultValidateCoordinates(lat, lng) {
        try {
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            return (
                !isNaN(latNum) &&
                !isNaN(lngNum) &&
                latNum >= -90 &&
                latNum <= 90 &&
                lngNum >= -180 &&
                lngNum <= 180
            );
        } catch {
            return false;
        }
    }

    /**
     * Clear all routes from the map.
     */
    clearRoutes() {
        this.routeLayerGroup.clearLayers();
    }

    /**
     * Remove the route layer group from the map.
     */
    destroy() {
        if (this.map && this.routeLayerGroup) {
            this.map.removeLayer(this.routeLayerGroup);
        }
    }
}
