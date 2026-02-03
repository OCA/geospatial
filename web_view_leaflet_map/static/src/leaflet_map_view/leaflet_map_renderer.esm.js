/** @odoo-module **/
/*
 * Copyright (C) 2025 KMEE (https://kmee.com.br)
 * @author Luis Felipe Mileo <mileo@kmee.com.br>
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
 */

/* global L, document, window */

import {
    Component,
    onMounted,
    onPatched,
    onWillStart,
    useRef,
    useState,
} from "@odoo/owl";
import {useService} from "@web/core/utils/hooks";
import {session} from "@web/session";

import {PinList} from "../components/pin-list/pin_list.esm";

// Default colors for group markers
const GROUP_COLORS = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
];

/**
 * LeafletMapRenderer component for displaying records on a Leaflet map.
 * Supports markers, clustering, popups, routing, and a sidebar pin list.
 */
export class LeafletMapRenderer extends Component {
    static template = "web_view_leaflet_map.LeafletMapRenderer";
    static components = {PinList};

    static props = {
        model: {type: Object},
        onResequence: {type: Function, optional: true},
        // Accept additional props from extending modules for extensibility
        "*": true,
    };

    /**
     * Initializes the LeafletMapRenderer component.
     */
    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.mapRef = useRef("mapContainer");

        // Session configuration
        this.leafletTileUrl = session["leaflet.tile_url"];
        this.leafletCopyright = session["leaflet.copyright"];

        // Extract configuration from model.metaData.archInfo
        const metaData = this.props.model.metaData || {};
        const archInfo = metaData.archInfo || {};

        this.resModel = metaData.resModel;
        this.fieldLatitude = archInfo.fieldLatitude;
        this.fieldLongitude = archInfo.fieldLongitude;
        this.fieldTitle = archInfo.fieldTitle;
        this.fieldAddress = archInfo.fieldAddress;
        this.fieldMarkerIconImage = archInfo.fieldMarkerIconImage;

        // Marker icon configuration
        this.markerIconSizeX = archInfo.markerIconSizeX || 64;
        this.markerIconSizeY = archInfo.markerIconSizeY || 64;
        this.markerPopupAnchorX = archInfo.markerPopupAnchorX || 0;
        this.markerPopupAnchorY = archInfo.markerPopupAnchorY || -32;

        // Map configuration
        this.defaultZoom = archInfo.defaultZoom || 7;
        this.maxZoom = archInfo.maxZoom || 19;
        this.zoomSnap = archInfo.zoomSnap || 1;

        // View options
        this.showPinList = archInfo.showPinList !== false;
        this.groupBy = archInfo.groupBy;
        this.panelTitle = archInfo.panelTitle || "Locations";
        this.showNumberedMarkers = archInfo.numberedMarkers === true;
        this.enableRouting = archInfo.routing === true;
        this.enableNavigation = archInfo.enableNavigation !== false;

        // Drag-and-drop configuration
        this.draggable = archInfo.draggable === true;
        this.groupField = archInfo.groupField;
        this.defaultOrder = archInfo.defaultOrder;

        // Configurable unassigned group name
        this.unassignedGroupName = archInfo.unassignedGroupName || "Unassigned";

        // Internal state (for backward compatibility with direct rendering)
        this.state = useState({
            selectedRecord: null,
        });

        // Map references
        this.leafletMap = null;
        this.mainLayer = null;
        this.routeLayer = null;
        this.markersById = {};
        this.groupColors = {};
        this.defaultLatLng = null;

        onWillStart(async () => {
            await this.initDefaultPosition();
        });

        onMounted(() => {
            this.initMap();
            this.renderMarkers();
        });

        onPatched(() => {
            if (this.leafletMap) {
                this.renderMarkers();
            }
        });
    }

    /**
     * Get records from the model.
     */
    get records() {
        return this.props.model.data?.records || [];
    }

    /**
     * Get loading state from the model.
     */
    get loading() {
        return this.props.model.data?.loading || false;
    }

    /**
     * Validates that coordinates are within valid ranges.
     * @param {Number} lat - Latitude
     * @param {Number} lng - Longitude
     * @returns {Boolean}
     */
    validateCoordinates(lat, lng) {
        try {
            const parsedLat = parseFloat(lat);
            const parsedLng = parseFloat(lng);
            return (
                !isNaN(parsedLat) &&
                !isNaN(parsedLng) &&
                parsedLat >= -90 &&
                parsedLat <= 90 &&
                parsedLng >= -180 &&
                parsedLng <= 180
            );
        } catch {
            return false;
        }
    }

    /**
     * Initializes the default position of the map by calling the server method.
     * @returns {Promise<void>}
     */
    async initDefaultPosition() {
        const result = await this.orm.call(
            "res.users",
            "get_default_leaflet_position",
            [this.resModel]
        );
        this.defaultLatLng = L.latLng(result.lat, result.lng);
    }

    /**
     * Initializes the Leaflet map in the container.
     */
    initMap() {
        const mapDiv = this.mapRef.el;
        if (!mapDiv) {
            return;
        }

        this.leafletMap = L.map(mapDiv, {
            zoomSnap: this.zoomSnap,
        }).setView(this.defaultLatLng, this.defaultZoom);

        L.tileLayer(this.leafletTileUrl, {
            maxZoom: this.maxZoom,
            attribution: this.leafletCopyright,
        }).addTo(this.leafletMap);

        // Initialize route layer for polylines
        if (this.enableRouting) {
            this.routeLayer = L.layerGroup().addTo(this.leafletMap);
        }
    }

    /**
     * Gets a color for a group based on its name.
     * @param {String} groupName
     * @returns {String}
     */
    getGroupColor(groupName) {
        if (this.groupColors[groupName]) {
            return this.groupColors[groupName];
        }

        let hash = 0;
        for (let i = 0; i < String(groupName).length; i++) {
            hash = String(groupName).charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
        this.groupColors[groupName] = color;
        return color;
    }

    /**
     * Gets the group name for a record.
     * @param {Object} record
     * @returns {string|null}
     */
    getGroupName(record) {
        if (!this.groupBy) return null;
        const value = record[this.groupBy];
        // Handle Many2one fields (array with [id, name])
        return Array.isArray(value) ? value[1] : value || "Undefined";
    }

    /**
     * Renders the markers on the map based on the loaded records.
     */
    renderMarkers() {
        if (!this.leafletMap) {
            return;
        }

        if (this.mainLayer) {
            this.leafletMap.removeLayer(this.mainLayer);
        }

        this.mainLayer = L.markerClusterGroup();
        this.markersById = {};

        let markerIndex = 0;
        for (const record of this.records) {
            const marker = this.prepareMarker(record, markerIndex);
            if (marker) {
                this.mainLayer.addLayer(marker);
                this.markersById[record.id] = marker;
                markerIndex++;
            }
        }

        const bounds = this.mainLayer.getBounds();
        if (bounds.isValid()) {
            this.leafletMap.fitBounds(bounds.pad(0.1));
        }

        this.leafletMap.addLayer(this.mainLayer);

        // Draw route lines if routing is enabled
        if (this.enableRouting && this.records.length > 1) {
            this.renderRouteLines();
        }
    }

    /**
     * Renders route lines connecting records in order.
     * Groups records by groupBy field if configured.
     */
    renderRouteLines() {
        if (!this.routeLayer) {
            this.routeLayer = L.layerGroup().addTo(this.leafletMap);
        }
        this.routeLayer.clearLayers();

        // Group records by groupBy field if configured
        const groups = {};
        for (const record of this.records) {
            const lat = record[this.fieldLatitude];
            const lng = record[this.fieldLongitude];

            if (!this.validateCoordinates(lat, lng)) {
                continue;
            }

            let groupKey = "default";
            if (this.groupBy && record[this.groupBy]) {
                const groupValue = record[this.groupBy];
                groupKey = Array.isArray(groupValue) ? groupValue[0] : groupValue;
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push({
                lat,
                lng,
                sequence: record.sequence || 0,
            });
        }

        // Draw lines for each group
        const colors = [
            "#007bff",
            "#28a745",
            "#dc3545",
            "#ffc107",
            "#17a2b8",
            "#6f42c1",
        ];
        let colorIndex = 0;

        for (const groupKey in groups) {
            const stops = groups[groupKey].sort((a, b) => a.sequence - b.sequence);

            if (stops.length < 2) {
                continue;
            }

            const waypoints = stops.map((s) => [s.lat, s.lng]);
            const color = colors[colorIndex % colors.length];

            const polyline = L.polyline(waypoints, {
                color: color,
                weight: 3,
                opacity: 0.7,
                dashArray: "10, 10",
            });

            polyline.addTo(this.routeLayer);
            colorIndex++;
        }
    }

    /**
     * Prepares a Leaflet marker for the given record.
     * @param {Object} record - The record object containing marker data
     * @param {Number} index - The marker index for numbering
     * @returns {L.Marker|null}
     */
    prepareMarker(record, index) {
        const lat = record[this.fieldLatitude];
        const lng = record[this.fieldLongitude];

        if (!lat || !lng || !this.validateCoordinates(lat, lng)) {
            return null;
        }

        const latlng = L.latLng(lat, lng);
        const markerOptions = this.prepareMarkerOptions(record, index);

        const marker = L.marker(latlng, markerOptions);
        const popup = L.popup().setContent(this.preparePopUpData(record, index));

        marker.bindPopup(popup).on("popupopen", () => {
            const selector = document.querySelector(".o_map_selector");
            if (selector) {
                selector.addEventListener("click", (ev) => {
                    ev.preventDefault();
                    this.onClickLeafletPopup(record);
                });
            }
        });

        return marker;
    }

    /**
     * Creates a numbered marker icon using SVG.
     * @param {Number} number - The number to display
     * @param {String} color - The marker color
     * @returns {L.DivIcon}
     */
    createNumberedMarker(number, color = "#007bff") {
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40" width="30" height="40">
                <path d="M15 0C6.716 0 0 6.716 0 15c0 8.284 15 25 15 25s15-16.716 15-25C30 6.716 23.284 0 15 0z" fill="${color}" stroke="#fff" stroke-width="1"/>
                <circle cx="15" cy="15" r="10" fill="#fff"/>
                <text x="15" y="19" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${number}</text>
            </svg>
        `;

        return L.divIcon({
            className: "o_leaflet_numbered_marker",
            html: svg,
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40],
        });
    }

    /**
     * Prepares the Leaflet icon for the marker using the image field.
     * @param {Object} record - The record object containing marker data
     * @returns {L.Icon}
     */
    prepareMarkerIcon(record) {
        // Use any date field as cache buster, or fall back to current time
        const lastUpdate =
            record.date_localization ||
            record.write_date ||
            record.id ||
            new Date().toISOString();
        const unique = String(lastUpdate).replace(/[^0-9]/g, "");
        const iconUrl = `/web/image?model=${this.resModel}&id=${record.id}&field=${this.fieldMarkerIconImage}&unique=${unique}`;

        return L.icon({
            iconUrl: iconUrl,
            className: "leaflet_marker_icon",
            iconSize: [this.markerIconSizeX, this.markerIconSizeY],
            popupAnchor: [this.markerPopupAnchorX, this.markerPopupAnchorY],
        });
    }

    /**
     * Prepares the options for the leaflet marker.
     * @param {Object} record - The record object containing marker data
     * @param {Number} index - The marker index
     * @returns {Object}
     */
    prepareMarkerOptions(record, index) {
        const title = record[this.fieldTitle] || "";
        const result = {
            title: title,
            alt: title,
            riseOnHover: true,
        };

        // Use numbered markers if enabled
        if (this.showNumberedMarkers) {
            const groupName = this.getGroupName(record);
            const color = groupName ? this.getGroupColor(groupName) : "#007bff";
            result.icon = this.createNumberedMarker(index + 1, color);
        } else if (this.fieldMarkerIconImage) {
            result.icon = this.prepareMarkerIcon(record);
        }

        return result;
    }

    /**
     * Prepares the HTML content for the leaflet popup.
     * @param {Object} record - The record object containing marker data
     * @param {Number} index - The marker index
     * @returns {String}
     */
    preparePopUpData(record, index) {
        const title = record[this.fieldTitle] || record.display_name || "";
        const address = record[this.fieldAddress] || "";
        const lat = record[this.fieldLatitude];
        const lng = record[this.fieldLongitude];

        // Build navigation URL
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

        let html = `
            <div class='o_map_popup'>
                <div class='o_map_selector' data-res-id='${record.id}'>
                    ${this.showNumberedMarkers ? `<span class="o_popup_number">${index + 1}.</span> ` : ""}
                    <b>${this.escapeHtml(title)}</b>
                </div>
                ${address ? `<div class="o_popup_address">${this.escapeHtml(address)}</div>` : ""}
        `;

        // Add navigation button if enabled
        if (this.enableNavigation) {
            html += `
                <div class="o_popup_actions mt-2">
                    <a href="${googleMapsUrl}" target="_blank" class="btn btn-sm btn-primary">
                        <i class="fa fa-location-arrow"></i> Navigate
                    </a>
                </div>
            `;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Escapes HTML to prevent XSS.
     * @param {String} text
     * @returns {String}
     */
    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Handles click on the leaflet popup to open the record form view.
     * @param {Object} record - The record object containing marker data
     */
    onClickLeafletPopup(record) {
        this.action.doAction({
            type: "ir.actions.act_window",
            res_model: this.resModel,
            res_id: record.id,
            views: [[false, "form"]],
            target: "current",
        });
    }

    /**
     * Centers the map on a specific record and opens its popup.
     * Called from PinList component.
     * @param {Object} record
     */
    onPinClick(record) {
        const lat = record[this.fieldLatitude];
        const lng = record[this.fieldLongitude];

        if (!this.validateCoordinates(lat, lng)) {
            return;
        }

        const marker = this.markersById[record.id];
        if (marker && this.leafletMap) {
            // Center map on the marker
            this.leafletMap.setView(
                [lat, lng],
                Math.max(this.leafletMap.getZoom(), 14)
            );

            // Open the marker popup (may need to unspider if in cluster)
            if (this.mainLayer.hasLayer(marker)) {
                this.mainLayer.zoomToShowLayer(marker, () => {
                    marker.openPopup();
                });
            } else {
                marker.openPopup();
            }
        }
    }

    /**
     * Handles navigation button click from PinList.
     * Opens Google Maps directions in a new tab.
     * @param {Object} record
     */
    onNavigateClick(record) {
        const lat = record[this.fieldLatitude];
        const lng = record[this.fieldLongitude];

        if (this.validateCoordinates(lat, lng)) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
            window.open(url, "_blank");
        }
    }

    /**
     * Callback for resequence events from DraggablePinList.
     * Delegates to the controller's onResequence handler.
     */
    async onResequence(recordId, targetGroupId, previousRecordId) {
        if (this.props.onResequence) {
            return this.props.onResequence(recordId, targetGroupId, previousRecordId);
        }
    }

    /**
     * Get the PinList component class to use.
     * Override in subclasses to use DraggablePinList.
     */
    get PinListComponent() {
        return PinList;
    }
}
