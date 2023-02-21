/** @odoo-module */
import {loadJS} from "@web/core/assets";
import {LayersPanel} from "./layers_panel/layers_panel.esm";
import {store} from "../../store.esm";
import {useService} from "@web/core/utils/hooks";
const {Component, onWillStart, onMounted, onRendered} = owl;

export class GeoengineRenderer extends Component {
    setup() {
        super.setup();
        this.orm = useService("orm");

        onWillStart(async () => {
            return loadJS(["/base_geoengine/static/lib/ol-7.2.2/ol.js"]);
        });

        onMounted(async () => {
            this.renderMap();
        });

        onRendered(() => {
            this.renderVectorLayers();
        });
    }

    createVectorLayer() {
        this.features = new ol.Collection();
        this.source = new ol.source.Vector({features: this.features});
        return new ol.layer.Vector({
            source: this.source,
            style: new ol.style.Style({
                fill: new ol.style.Fill({
                    color: "#ee9900",
                    opacity: 0.1,
                }),
                stroke: new ol.style.Stroke({
                    color: "#333333",
                    width: 2,
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

    addFeatures() {
        this.props.data.records.forEach((record) => {
            const value = record._values;
            const keys = Object.keys(value);
            const geom = keys.find(
                (key) => key.startsWith("the_") && value[key] !== false
            );
            const ft = new ol.Feature({
                geometry: new ol.format.GeoJSON().readGeometry(value[geom]),
                labelPoint: new ol.format.GeoJSON().readGeometry(value[geom]),
            });
            this.source.addFeature(ft);
        });
    }

    updateMapZoom(zoom) {
        if (this.source) {
            var extent = this.source.getExtent();
            var infinite_extent = [Infinity, Infinity, -Infinity, -Infinity];
            if (extent !== infinite_extent) {
                var map_view = this.map.getView();
                if (map_view) {
                    map_view.fit(extent, {maxZoom: zoom});
                }
            }
        }
    }

    renderVectorLayers() {
        if (this.source) {
            this.source.clear();
        } else {
            this.vectorLayer = this.createVectorLayer();
        }
        this.addFeatures();
        if (this.map !== undefined) {
            this.updateMapZoom(15);
        }
    }

    onHover() {
        const selectStyle = new ol.style.Style({
            fill: new ol.style.Fill({
                color: "#eeeeee",
            }),
            stroke: new ol.style.Stroke({
                color: "rgba(255, 255, 255, 0.8)",
                width: 2,
            }),
        });
        let selected = null;
        this.map.on("pointermove", (e) => {
            if (selected !== null) {
                selected.setStyle(undefined);
                selected = null;
            }
            this.map.forEachFeatureAtPixel(e.pixel, (f) => {
                selected = f;
                selectStyle
                    .getFill()
                    .setColor(f.get("COLOR") || "rgba(255, 255, 255, 0.4)");
                f.setStyle(selectStyle);
                return true;
            });
        });
    }

    renderMap() {
        if (!this.map) {
            this.map = new ol.Map({
                target: "olmap",
                layers: [
                    new ol.layer.Group({
                        title: "Base maps",
                        layers: this.createBackgroundLayers(store.layers),
                    }),
                ],
                view: new ol.View({
                    center: [0, 0],
                    zoom: 2,
                }),
            });
            this.map.addLayer(this.vectorLayer);
            this.updateMapZoom(10);
            this.setupControls();
            this.onHover();
            store.setMap(this.map);
        }
    }

    createBackgroundLayers(backgrounds) {
        const backgroundLayers = backgrounds.backgrounds.map((background) => {
            if (background.raster_type === "osm") {
                return new ol.layer.Tile({
                    title: background.name,
                    visible: !background.overlay,
                    type: "base",
                    source: new ol.source.OSM(),
                });
            }
                return undefined;

        });
        // Pour le moment pour que ça marche car je prend pas en compte toute les types.
        const index = backgroundLayers.findIndex((layer) => layer === undefined);
        if (index !== -1) {
            backgroundLayers.splice(index, 1);
        }
        return backgroundLayers;
    }

    setupControls() {
        const scaleLine = new ol.control.ScaleLine();
        this.map.addControl(scaleLine);
    }
}

GeoengineRenderer.template = "base_geoengine.GeoengineRenderer";
GeoengineRenderer.components = {LayersPanel};
