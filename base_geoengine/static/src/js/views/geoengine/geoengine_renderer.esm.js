/** @odoo-module */
import {loadJS} from "@web/core/assets";
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
            const ft = new ol.Feature({
                geometry: new ol.format.GeoJSON().readGeometry(value.the_geom),
                labelPoint: new ol.format.GeoJSON().readGeometry(value.the_geom),
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
                    new ol.layer.Tile({
                        source: new ol.source.OSM(),
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
        }
    }

    setupControls() {
        const scaleLine = new ol.control.ScaleLine();
        this.map.addControl(scaleLine);
    }
}

GeoengineRenderer.template = "base_geoengine.GeoengineRenderer";
