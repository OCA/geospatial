import {registry} from "@web/core/registry";
import {useService} from "@web/core/utils/hooks";
import {Layout} from "@web/search/layout";
import {session} from "@web/session";

/* global L, console, document, DOMParser */

const {Component, useSubEnv, onWillStart, onMounted, onPatched, useRef} = owl;

export class MapRenderer extends Component {
    /**
     * Initializes the MapRenderer component, setting up services, references, and configuration.
     */
    setup() {
        console.log(this.props);
        this.orm = useService("orm");
        this.action = useService("action");
        this.mapRef = useRef("mapContainer");
        this.leafletTileUrl = session["leaflet.tile_url"];
        this.leafletCopyright = session["leaflet.copyright"];

        const archAttrs = this.props.archInfo.arch.attributes;

        this.resModel = this.props.resModel;
        this.defaultZoom = parseInt(archAttrs.default_zoom, 10) || 7;
        this.maxZoom = parseInt(archAttrs.max_zoom, 10) || 19;
        this.zoomSnap = parseInt(archAttrs.zoom_snap, 10) || 1;

        this.fieldLatitude = archAttrs.field_latitude?.value;
        this.fieldLongitude = archAttrs.field_longitude?.value;
        this.fieldTitle = archAttrs.field_title?.value;
        this.fieldAddress = archAttrs.field_address?.value;
        this.fieldMarkerIconImage = archAttrs.field_marker_icon_image?.value;

        this.markerIconSizeX = parseInt(archAttrs.marker_icon_size_x?.value, 10) || 64;
        this.markerIconSizeY = parseInt(archAttrs.marker_icon_size_y?.value, 10) || 64;
        this.markerPopupAnchorX =
            parseInt(archAttrs.marker_popup_anchor_x?.value, 10) || 0;
        this.markerPopupAnchorY =
            parseInt(archAttrs.marker_popup_anchor_y?.value, 10) || -32;

        this.leafletMap = null;
        this.mainLayer = null;

        onWillStart(async () => {
            await this.initDefaultPosition();
            await this.loadRecords();
        });

        onMounted(() => {
            this.initMap();
            this.renderMarkers();
        });

        onPatched(() => {
            console.log("onPatched");
            if (this.leafletMap) {
                this.renderMarkers();
            }
        });
    }

    /**
     * Loads records from the server based on the provided domain and fields.
     * @returns {Promise<void>}
     */
    async loadRecords() {
        const fields = this.getFields();

        try {
            // Cargar registros usando searchRead
            const records = await this.orm.searchRead(
                this.resModel,
                this.props.domain || [],
                fields,
                {
                    limit: this.props.limit || 80,
                    context: this.props.context || {},
                }
            );
            this.records = records;
        } catch (error) {
            console.error("Error loading records:", error);
            this.records = [];
        }
    }

    /**
     * Gathers the required fields for the map view.
     * @returns {any[]}
     */
    getFields() {
        const fields = new Set();

        // Required fields
        fields.add("id");
        fields.add("display_name");
        fields.add("date_localization");

        // Optional fields based on arch attributes
        if (this.fieldLatitude) fields.add(this.fieldLatitude);
        if (this.fieldLongitude) fields.add(this.fieldLongitude);
        if (this.fieldTitle) fields.add(this.fieldTitle);
        if (this.fieldAddress) fields.add(this.fieldAddress);
        if (this.fieldMarkerIconImage) fields.add(this.fieldMarkerIconImage);

        return Array.from(fields);
    }

    /**
     * Initializes the default position of the map by calling the server method.
     * @returns {Promise<void>}
     */
    async initDefaultPosition() {
        const result = await this.orm.call(
            "res.users",
            "get_default_leaflet_position",
            [this.props.resModel]
        );
        this.defaultLatLng = L.latLng(result.lat, result.lng);
    }

    /**
     * Initializes the Leaflet map in the container.
     */
    initMap() {
        const mapDiv = this.mapRef.el;
        if (!mapDiv) {
            console.error("Map container not found");
            return;
        }

        this.leafletMap = L.map(mapDiv, {
            zoomSnap: this.zoomSnap,
        }).setView(this.defaultLatLng, this.defaultZoom);

        L.tileLayer(this.leafletTileUrl, {
            maxZoom: this.maxZoom,
            attribution: this.leafletCopyright,
        }).addTo(this.leafletMap);
    }

    /**
     * Renders the markers on the map based on the loaded records.
     */
    renderMarkers() {
        if (!this.leafletMap) {
            console.warn("Map not initialized yet");
            return;
        }

        if (this.mainLayer) {
            this.leafletMap.removeLayer(this.mainLayer);
        }

        this.mainLayer = L.markerClusterGroup();
        for (const record of this.records) {
            const marker = this.prepareMarker(record);
            if (marker) {
                this.mainLayer.addLayer(marker);
            }
        }
        const bounds = this.mainLayer.getBounds();
        if (bounds.isValid()) {
            // Adapt the map's position based on the map's points
            this.leafletMap.fitBounds(bounds.pad(0.1));
        }

        this.leafletMap.addLayer(this.mainLayer);
    }

    /**
     * Prepares a Leaflet marker for the given record.
     * @param {Object} record - The record object containing marker data
     * @returns {*}
     */
    prepareMarker(record) {
        const lat = record[this.fieldLatitude];
        const lng = record[this.fieldLongitude];
        let marker = null;
        if (!lat || !lng) {
            console.log(`Record ${record.id} has no coordinates`);
            return;
        }

        const latlng = L.latLng(lat, lng);
        if (latlng.lat !== 0 && latlng.lng !== 0) {
            const markerOptions = this.prepareMarkerOptions(record);

            marker = L.marker(latlng, markerOptions);
            const popup = L.popup().setContent(this.preparePopUpData(record));

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
    }

    /**
     * Prepares the Leaflet icon for the marker using the image field.
     * @param {Object} record - The record object containing marker data
     * @returns {*}
     */
    prepareMarkerIcon(record) {
        const lastUpdate = record.date_localization || new Date().toISOString();
        const unique = lastUpdate.replace(/[^0-9]/g, "");
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
     * @returns {{riseOnHover: Boolean, alt: (*|string), title: (*|string)}}
     */
    prepareMarkerOptions(record) {
        const title = record[this.fieldTitle] || "";
        const result = {
            title: title,
            alt: title,
            riseOnHover: true,
        };

        if (this.fieldMarkerIconImage) {
            result.icon = this.prepareMarkerIcon(record);
        }

        return result;
    }

    /**
     * Prepares the HTML content for the leaflet popup.
     * @param {Object} record - The record object containing marker data
     * @returns {String}
     */
    preparePopUpData(record) {
        const title = record[this.fieldTitle] || "";
        const address = record[this.fieldAddress] || "";

        return `
            <div class='o_map_selector' data-res-id='${record.resId}'>
                <b>${title}</b><br/>
                ${address ? ` - ${address}` : ""}
            </div>
        `;
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
}

MapRenderer.template = "web_view_leaflet_map.MapRenderer";
MapRenderer.components = {};

/**
 * Controller class for the Map view, setting up the environment configuration.
 */
export class MapController extends Component {
    setup() {
        useSubEnv({
            config: {
                ...this.env.config,
            },
        });
    }
}

MapController.template = "web_view_leaflet_map.MapView";
MapController.components = {Layout, MapRenderer};

/**
 * Helper function that normalize the architecture input to ensure it is an HTMLElement.
 * @param arch
 * @returns {HTMLElement|*}
 */
function normalizeArch(arch) {
    if (arch && typeof arch !== "string") return arch;
    const xml = String(arch || "");
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    return doc.documentElement;
}

/**
 * Definition of the map view for Odoo, including its properties and components.
 * @type {{searchMenuTypes: string[], icon: string, Renderer: MapRenderer, multiRecord: boolean, type: string, display_name: string, Controller: MapController, props: (function(*, *): *&{archInfo: {arch: *}, Renderer: MapRenderer})}}
 */
export const mapView = {
    type: "leaflet_map",
    display_name: "Map",
    icon: "fa fa-map-o",
    multiRecord: true,
    Controller: MapController,
    Renderer: MapRenderer,
    searchMenuTypes: ["filter", "favorite"],

    props: (genericProps) => {
        const archEl = normalizeArch(genericProps.arch);
        return {
            ...genericProps,
            Renderer: MapRenderer,
            archInfo: {
                arch: archEl,
            },
        };
    },
};

registry.category("views").add("leaflet_map", mapView);
