/** @odoo-module **/

import { registry } from "@web/core/registry";
import { Layout } from "@web/search/layout";
import { getDefaultConfig } from "@web/views/view";
import { useService } from "@web/core/utils/hooks";
import { session } from "@web/session";

const { Component, useSubEnv, onWillStart, onMounted, onPatched, useRef } = owl;

export class MapRenderer extends Component {
    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.mapRef = useRef("mapContainer");
        console.log('SESION', this);
        this.leafletTileUrl = session['leaflet.tile_url'];
        this.leafletCopyright = session['leaflet.copyright'];

        const archAttrs = this.props.archInfo.arch.attributes;
        console.log(this.props);
        this.resModel = this.props.resModel;
        this.defaultZoom = parseInt(archAttrs.default_zoom) || 7;
        this.maxZoom = parseInt(archAttrs.max_zoom) || 19;
        this.zoomSnap = parseInt(archAttrs.zoom_snap) || 1;
        this.fieldLatitude = archAttrs.field_latitude;
        this.fieldLongitude = archAttrs.field_longitude;
        this.fieldTitle = archAttrs.field_title;
        this.fieldAddress = archAttrs.field_address;
        this.fieldMarkerIconImage = archAttrs.field_marker_icon_image;
        this.markerIconSizeX = parseInt(archAttrs.marker_icon_size_x) || 64;
        this.markerIconSizeY = parseInt(archAttrs.marker_icon_size_y) || 64;
        this.markerPopupAnchorX = parseInt(archAttrs.marker_popup_anchor_x) || 0;
        this.markerPopupAnchorY = parseInt(archAttrs.marker_popup_anchor_y) || -32;

        console.log('this', this);
        this.leafletMap = null;
        this.leafletLayerGroup = null;


        onWillStart(async () => {
            await this.initDefaultPosition();
            await this.loadRecords();
        });

        onMounted(() => {
            console.log('onMounted ejecutado');
            this.initMap();
            this.renderMarkers();
        });

        onPatched(() => {
            console.log('onPatched ejecutado');
            if (this.leafletMap) {
                this.renderMarkers();
            }
        });
    }

    async loadRecords() {
        console.log('Loading records from database...');

        // Obtener los campos del arch
        // const fields = this.getFieldsFromArch();
        // console.log('Fields to load:', fields);

        try {
            // Cargar registros usando searchRead
            const records = await this.orm.searchRead(
                this.resModel,
                this.props.domain || [],
                [],
                {
                    limit: this.props.limit || 80,
                    context: this.props.context || {},
                }
            );

            console.log(`Loaded ${records.length} records from database`);
            console.log(records);
            this.records = records;
        } catch (error) {
            console.error('Error loading records:', error);
            this.records = [];
        }
    }

    // getFieldsFromArch() {
    //     const fields = new Set();
    //
    //     // Campos obligatorios
    //     fields.add('id');
    //     fields.add('display_name');
    //     fields.add('__last_update');
    //
    //     // Campos de configuración del mapa
    //     if (this.fieldLatitude) fields.add(this.fieldLatitude);
    //     if (this.fieldLongitude) fields.add(this.fieldLongitude);
    //     if (this.fieldTitle) fields.add(this.fieldTitle);
    //     if (this.fieldAddress) fields.add(this.fieldAddress);
    //     if (this.fieldMarkerIconImage) fields.add(this.fieldMarkerIconImage);
    //
    //     // Campos del arch XML
    //     const arch = this.props.archInfo.arch;
    //     if (arch.children) {
    //         arch.children.forEach(child => {
    //             if (child.tag === 'field' && child.attrs?.name) {
    //                 fields.add(child.attrs.name);
    //             }
    //         });
    //     }
    //
    //     return Array.from(fields);
    // }

    async initDefaultPosition() {
        const result = await this.orm.call(
            "res.users",
            "get_default_leaflet_position",
            [this.props.resModel]
        );
        this.defaultLatLng = L.latLng(result.lat, result.lng);
        console.log('Default position:', this.defaultLatLng);
    }

    initMap() {
        console.log('INIT MAP');
        const mapDiv = this.mapRef.el;
        console.log('MAP DIV', mapDiv);

        if (!mapDiv) {
            console.error('Map container not found');
            return;
        }

        console.log('INIT MAP 2');
        this.leafletMap = L.map(mapDiv, {
            zoomSnap: this.zoomSnap,
        }).setView(this.defaultLatLng, this.defaultZoom);

        console.log('INIT MAP 3');
        L.tileLayer(this.leafletTileUrl, {
            maxZoom: this.maxZoom,
            attribution: this.leafletCopyright,
        }).addTo(this.leafletMap);

        console.log('INIT MAP 4');
        // setTimeout(() => {
        //     if (this.leafletMap) {
        //         this.leafletMap.invalidateSize();
        //         console.log('Map invalidated');
        //     }
        // }, 100);
    }

    renderMarkers() {
        if (!this.leafletMap) {
            console.warn('Map not initialized yet');
            return;
        }

        if (this.leafletLayerGroup) {
            this.leafletMap.removeLayer(this.leafletLayerGroup);
        }

        this.leafletLayerGroup = L.layerGroup().addTo(this.leafletMap);
        console.log(`Rendering ${this.records.length} markers`);

        for (const record of this.records) {
            this.renderRecord(record);
        }

        setTimeout(() => {
            if (this.leafletMap) {
                this.leafletMap.invalidateSize();
            }
        }, 100);
    }

    renderRecord(record) {
        console.log('RENDER RECORD', record, this.fieldLatitude);
        const lat = record.partner_latitude;
        const lng = record.partner_longitude;
        console.log(lat, lng)

        if (!lat || !lng) {
            console.log(`Record ${record.id} has no coordinates`);
            return;
        }

        const latlng = L.latLng(lat, lng);
        console.log('MARK', latlng);
        if (latlng.lat !== 0 && latlng.lng !== 0) {
            // const markerOptions = this.prepareMarkerOptions(record);
            console.log('LATLNG', latlng, this.leafletLayerGroup)
            const marker = L.marker(latlng).addTo(this.leafletMap);

            // const popup = L.popup().setContent(this.preparePopUpData(record));
            //
            // marker.bindPopup(popup).on("popupopen", () => {
            //     const selector = document.querySelector('.o_map_selector');
            //     if (selector) {
            //         selector.addEventListener('click', (ev) => {
            //             ev.preventDefault();
            //             this.onClickLeafletPopup(record);
            //         });
            //     }
            // });

            console.log(`Marker added`);
        }
    }

    onClickLeafletPopup(record) {
        this.action.doAction({
            type: 'ir.actions.act_window',
            res_model: record.resModel,
            res_id: record.resId,
            views: [[false, 'form']],
            target: 'current',
        });
    }

    prepareMarkerIcon(record) {
        const lastUpdate = record.data.__last_update || new Date().toISOString();
        const unique = lastUpdate.replace(/[^0-9]/g, '');
        const iconUrl = `/web/image?model=${record.resModel}&id=${record.resId}&field=${this.fieldMarkerIconImage}&unique=${unique}`;

        return L.icon({
            iconUrl: iconUrl,
            className: 'leaflet_marker_icon',
            iconSize: [this.markerIconSizeX, this.markerIconSizeY],
            popupAnchor: [this.markerPopupAnchorX, this.markerPopupAnchorY],
        });
    }

    prepareMarkerOptions(record) {
        const title = record.data[this.fieldTitle] || '';
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

    preparePopUpData(record) {
        const title = record.data[this.fieldTitle] || '';
        const address = record.data[this.fieldAddress] || '';

        return `
            <div class='o_map_selector' data-res-id='${record.resId}'>
                <b>${title}</b><br/>
                ${address ? ` - ${address}` : ''}
            </div>
        `;
    }
}

MapRenderer.template = "web_view_leaflet_map.MapRenderer";
MapRenderer.components = {};

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
MapController.components = { Layout, MapRenderer };

export const mapView = {
    type: "leaflet_map",
    display_name: "Map",
    icon: "fa fa-map-o",
    multiRecord: true,
    Controller: MapController,
    Renderer: MapRenderer,
    searchMenuTypes: ["filter", "favorite"],

    props: (genericProps, view) => {
        console.log('GENERIC PROPS', genericProps);
        const { arch, relatedModels, resModel } = genericProps;
        return {
            ...genericProps,
            // Model: genericProps.Model,
            Renderer: MapRenderer,
            archInfo: {
                arch: arch,
            },
        };
    },
};

registry.category("views").add("leaflet_map", mapView);
