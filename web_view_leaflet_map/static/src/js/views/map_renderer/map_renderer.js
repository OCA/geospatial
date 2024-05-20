/** @odoo-module **/

import {Component, useState, onWillStart, onMounted} from "@odoo/owl";
import {session} from "@web/session";
import {loadBundle} from "@web/core/assets";
import {useService} from "@web/core/utils/hooks";
import {formatDateTime} from "@web/core/l10n/dates";

export class MapRenderer extends Component {
    setup() {
        this.state = useState({});

        this.leaflet_tile_url = session["leaflet.tile_url"];
        this.leaflet_copyright = session["leaflet.copyright"];

        this.field_marker_icon_image =
            this.props.archInfo.allFields.field_marker_icon_image;
        this.marker_icon_size_x =
            this.props.archInfo.allFields.marker_icon_size_x || 64;
        this.marker_icon_size_y =
            this.props.archInfo.allFields.marker_icon_size_y || 64;
        this.marker_popup_anchor_x =
            this.props.archInfo.allFields.marker_popup_anchor_x || 0;
        this.marker_popup_anchor_y =
            this.props.archInfo.allFields.marker_popup_anchor_y || -32;
        this.field_latitude = this.props.archInfo.allFields.field_latitude;
        this.field_longitude = this.props.archInfo.allFields.field_longitude;
        this.default_zoom = this.props.archInfo.allFields.default_zoom || 7;
        this.max_zoom = this.props.archInfo.allFields.max_zoom || 19;
        this.zoom_snap = this.props.archInfo.allFields.zoom_snap | 1;
        this.field_title = this.props.archInfo.allFields.field_title;
        this.field_address = this.props.archInfo.allFields.field_address;
        this.orm = useService("orm");

        onWillStart(async () =>
            Promise.all([
                await loadBundle({
                    jsLibs: ["/web_view_leaflet_map/static/lib/leaflet/leaflet.js"],
                    cssLibs: ["/web_view_leaflet_map/static/lib/leaflet/leaflet.css"],
                }),
            ])
        );

        onMounted(async () => {
            await this._initDefaultPosition();
            this._initMap();
            this._render();
        });
    }

    async _render() {
        if (this.leaflet_layer_group) {
            this.leaflet_map.removeLayer(this.leaflet_layer_group);
        }

        this.leaflet_layer_group = L.layerGroup().addTo(this.leaflet_map);
        for (const record of this.props.data.records) {
            this._renderRecord(record);
        }

        await super._render();
        setTimeout(() => {
            this.leaflet_map.invalidateSize();
        }, 1);
    }

    _renderRecord(record) {
        const latlng = L.latLng(
            record.data[this.field_latitude],
            record.data[this.field_longitude]
        );

        if (latlng.lat !== 0 && latlng.lng !== 0) {
            const markerOptions = this._prepareMarkerOptions(record);
            const marker = L.marker(latlng, markerOptions).addTo(
                this.leaflet_layer_group
            );

            const popup = L.popup().setContent(this._preparePopUpData(record));

            marker.bindPopup(popup).on("popupopen", () => {
                $(".o_map_selector").parent().parent().click(
                    {
                        model_name: record.model,
                        res_id: record.data.id,
                        current_object: this,
                    },
                    this._onClickLeafletPopup.bind(this)
                );
            });
        }
    }

    _preparePopUpData(record) {
        return `
            <div class='o_map_selector' res_id='${record.data.id}'>
                <b>${record.data[this.field_title]}</b><br/>
                - ${record.data[this.field_address]}
            </div>`;
    }

    _prepareMarkerIcon(record) {
        return L.icon({
            iconUrl: session.url("/web/image", {
                model: record.model,
                id: JSON.stringify(record.data.id),
                field: this.field_marker_icon_image,
                unique: formatDateTime(record.data.__last_update).replace(
                    /[^0-9]/g,
                    ""
                ),
            }),
            className: "leaflet_marker_icon",
            iconSize: [this.marker_icon_size_x, this.marker_icon_size_y],
            popupAnchor: [this.marker_popup_anchor_x, this.marker_popup_anchor_y],
        });
    }

    _prepareMarkerOptions(record) {
        const icon = this._prepareMarkerIcon(record);
        return {
            title: record.data[this.field_title],
            alt: record.data[this.field_title],
            riseOnHover: true,
            icon: icon,
        };
    }

    async _initDefaultPosition() {
        /*const result = await this.orm.call({
            model: "res.users",
            method: "get_default_leaflet_position",
            args: [this.props.data.resModel],
        });
        this.default_lat_lng = L.latLng(result.lat, result.lng);*/
        this.default_lat_lng = {lat: 41.40869, lng: -75.66213};
    }

    _initMap() {
        const $mainDiv = $("<div id='div_map' class='o_leaflet_map_container'/>");
        this.leaflet_container = $mainDiv[0];
        this.leaflet_map = L.map(this.leaflet_container, {
            zoomSnap: this.zoom_snap,
        }).setView(this.default_lat_lng, this.default_zoom);
        this.leaflet_tiles = L.tileLayer(this.leaflet_tile_url, {
            maxZoom: this.max_zoom,
            attribution: this.leaflet_copyright,
        }).addTo(this.leaflet_map);
        this.$el.append($mainDiv);
    }
}

MapRenderer.template = "web_view_leaflet_map.MapRenderer";
