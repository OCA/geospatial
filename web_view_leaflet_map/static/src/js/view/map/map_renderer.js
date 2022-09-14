odoo.define('web_view_leaflet_map.MapRenderer', function (require) {
    'use strict';

    var AbstractRenderer = require('web.AbstractRenderer');
    var session = require('web.session');
    var field_utils = require('web.field_utils');

    var MapRenderer = AbstractRenderer.extend({
        tagName: 'div',
        className: 'o_leaflet_main_container',

        init: function (parent, state, params) {
            this._super.apply(this, arguments);

            this.leaflet_tile_url = session['leaflet.tile_url'];
            this.leaflet_copyright = session['leaflet.copyright'];
            this.default_zoom = params.arch.attrs.default_zoom || 7;
            this.max_zoom = params.arch.attrs.max_zoom || 19;
            this.zoom_snap = params.arch.attrs.zoom_snap | 1;
            this.field_latitude = params.arch.attrs.field_latitude;
            this.field_longitude = params.arch.attrs.field_longitude;
            this.field_title = params.arch.attrs.field_title;
            this.field_address = params.arch.attrs.field_address;
            this.field_marker_icon_image = params.arch.attrs.field_marker_icon_image;
            this.marker_icon_size_x = params.arch.attrs.marker_icon_size_x || 64;
            this.marker_icon_size_y = params.arch.attrs.marker_icon_size_y || 64;
            this.marker_popup_anchor_x = params.arch.attrs.marker_popup_anchor_x || 0;
            this.marker_popup_anchor_y = params.arch.attrs.marker_popup_anchor_y || -32;
        },

        start: function () {
            var self = this;
            var self_super = this._super;
            return this._initDefaultPosition().then(function () {
                self._initMap();
            }).then(function () {
                return self_super.apply(self, arguments);
            })
        },

        _render: function () {
            var self = this;

            // First remove previous layer that contains
            // all the previously rendered records
            if (this.leaflet_layer_group) {
                this.leaflet_map.removeLayer(this.leaflet_layer_group);
            }

            // Create a new layer and render fresh records
            this.leaflet_layer_group = L.layerGroup().addTo(this.leaflet_map);
            _.each(this.state.data, function (record) {
                self._renderRecord(record);
            });

            // Delay and call invalidateSize() to display correctly
            // the map. See.
            // https://github.com/Leaflet/Leaflet/issues/3002#issuecomment-93836022
            return this._super.apply(this, arguments).then(function () {
                window.setTimeout(function(){
                      self.leaflet_map.invalidateSize();
                },1);
            })
        },

        _renderRecord: function(record) {
            var self = this;
            var latlng = L.latLng(record.data[this.field_latitude], record.data[this.field_longitude]);
            // Display only records that have a valid position
            if (latlng.lat != 0 && latlng.lng != 0) {
                // create marker
                var markerOptions = this._prepareMarkerOptions(record);
                var marker = L.marker(latlng, markerOptions).addTo(this.leaflet_layer_group);

                // Create Popup and attach an event onclick
                var popup = L.popup().setContent(this._preparePopUpData(record));

                marker.bindPopup(popup).on("popupopen", () => {
                    $(".o_map_selector").parent().parent().click({model_name: record.model, res_id: record.data["id"], current_object: self}, self._onClickLeafletPopup);
                });

            }
        },

        _onClickLeafletPopup: function (ev) {
            ev.preventDefault();
            ev.data.current_object.trigger_up('switch_view', {
                view_type: 'form',
                res_id: ev.data.res_id,
                model: ev.data.model_name,
            });
        },

        _prepareMarkerIcon: function(record) {
            var myIcon = L.icon({
                iconUrl: session.url('/web/image', {
                    model: record.model,
                    id: JSON.stringify(record.data.id),
                    field: this.field_marker_icon_image,
                    // unique forces a reload of the image when the record has been updated
                   unique: field_utils.format.datetime(record.data.__last_update).replace(/[^0-9]/g, ''),
                }),
                className: "leaflet_marker_icon",
                iconSize: [this.marker_icon_size_x, this.marker_icon_size_y],
                popupAnchor: [this.marker_popup_anchor_x, this.marker_popup_anchor_y],
            });
            return myIcon;

        },

        _prepareMarkerOptions: function (record) {
            var icon = this._prepareMarkerIcon(record);
            var result = {
                title: record.data[this.field_title],
                alt: record.data[this.field_title],
                riseOnHover: true,
            }
            if (icon) {
                result.icon = icon;
            }
            return result;
        },

        _preparePopUpData: function (record) {
            return (
                "<div class='o_map_selector' res_id='" + record.data["id"] + "'>"
                + "<b>" + record.data[this.field_title] + "</b><br/>"
                + " - " + record.data[this.field_address]
                + "</div>"
            );
        },

        _initDefaultPosition: function () {
            var self = this;
            return this._rpc({
                model: "res.users",
                method: 'get_default_leaflet_position',
                args: [this.state.model],
            }).then(function (result) {
                self.default_lat_lng = L.latLng(result.lat, result.lng);
            })
        },

        _initMap: function () {
            var $mainDiv = $("<div id='div_map' class='o_leaflet_map_container'/>");
            this.leaflet_container = $mainDiv[0];
            this.leaflet_map = L.map(this.leaflet_container, {
                zoomSnap: this.zoom_snap,
            }).setView(this.default_lat_lng, this.default_zoom);
            this.leaflet_tiles = L.tileLayer(this.leaflet_tile_url, {
                maxZoom: this.max_zoom,
                attribution: this.leaflet_copyright,
            }).addTo(this.leaflet_map);
            this.$el.append($mainDiv);
        },

    });

    return MapRenderer;

});
