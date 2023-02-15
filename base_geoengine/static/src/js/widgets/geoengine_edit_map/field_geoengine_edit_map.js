/** @odoo-module */

import {loadJS} from "@web/core/assets";
import {BackgroundLayers} from "../../geoengine_common";
import {registry} from "@web/core/registry";

const {Component, onWillStart, useRef, onMounted} = owl;

export class FieldGeoEngineEditMap extends Component {
    setup() {
        super.setup();
        this.geoType = null;
        this.map = null;
        this.defaultExtent = null;
        this.format = null;
        this.vectorLayer = null;
        this.rasterLayers = null;
        this.source = null;
        this.features = null;
        this.drawControl = null;
        this.modifyControl = null;
        this.tabListenerInstalled = false;
        this.bgLayers = new BackgroundLayers();

        this.mapRef = useRef("map");

        onWillStart(() => {
            return loadJS(["/base_geoengine/static/lib/ol-7.2.2/ol.js"]);
        });

        onMounted(() => {
            this.createLayers();
            this.renderMap();
        });
    }
    /**
     * Displays a predefined area on the map using the collection of features.
     */
    createVectorLayer() {
        this.features = new ol.Collection();
        this.source = new ol.source.Vector({features: this.features});
        return new ol.layer.Vector({
            source: this.source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: "#ee9900",
                    opacity: 0.7,
                }),
                stroke: new ol.style.Stroke({
                    color: "#ee9900",
                    width: 3,
                    opacity: 1,
                }),
                image: new ol.style.Circle({
                    radius: 7,
                    fill: new ol.style.Fill({
                        color: "#ffcc33",
                    }),
                }),
            }),
        });
    }

    createDrawVector() {
        return new ol.layer.Vector({
            source: new ol.source.Vector(),
        });
    }

    createLayers() {
        this.vectorLayer = this.createVectorLayer();
        this.drawVector = this.createDrawVector();
    }

    /**
     * Allows you to centre the area defined for the user
     */

    updateMapZoom() {
        if (this.source) {
            var extent = this.source.getExtent();
            var infinite_extent = [Infinity, Infinity, -Infinity, -Infinity];
            if (extent !== infinite_extent) {
                var map_view = this.map.getView();
                if (map_view) {
                    map_view.fit(extent, {maxZoom: 14});
                }
            }
        }
    }

    updateMapEmpty() {
        var map_view = this.map.getView();
        // Default extent
        if (map_view) {
            var extent = [
                "-123164.85222423",
                "5574694.9538936",
                "1578017.6490538",
                "6186191.1800898",
            ];
            extent = extent.map((coord) => Number(coord));
            map_view.fit(extent, {maxZoom: this.defaultZoom || 5});
        }
    }

    /**
     * Based on the value passed in props, adds a new feature to the collection.
     * @param {*} value
     */

    setValue(value) {
        if (this.map) {
            var ft = new ol.Feature({
                geometry: new ol.format.GeoJSON().readGeometry(value),
                labelPoint: new ol.format.GeoJSON().readGeometry(value),
            });
            this.source.clear();
            this.source.addFeature(ft);

            if (value) {
                this.updateMapZoom();
            } else {
                this.updateMapEmpty();
            }
        }
    }

    setupControls() {
        let drawInteraction = new ol.interaction.Draw({
            type: "Polygon",
            source: this.drawVector.getSource(),
        });
        this.map.addInteraction(drawInteraction);
    }

    /**
     * Displays the map in the div provided
     */
    renderMap() {
        if (this.map) {
            this.map.destroy();
        }
        this.map = new ol.Map({
            target: "map",
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM(),
                }),
                this.drawVector,
            ],
            view: new ol.View({
                center: [0, 0],
                zoom: 5,
            }),
        });
        this.map.addLayer(this.vectorLayer);
        this.setValue(this.props.value);
        this.setupControls();
    }
}

FieldGeoEngineEditMap.template = "FieldGeoEngineEditMap";
FieldGeoEngineEditMap.supportedTypes = ["geo_multi_polygon"];
registry.category("fields").add("geo_edit_map", FieldGeoEngineEditMap);
