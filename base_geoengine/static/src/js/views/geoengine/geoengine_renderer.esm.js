/** @odoo-module */
import {useService} from "@web/core/utils/hooks";
import {loadJS} from "@web/core/assets";

const {Component, onWillStart, onMounted, onRendered} = owl;

export class GeoengineRenderer extends Component {
    setup() {
        super.setup();

        this.orm = useService("orm");

        onWillStart(async () => {
            return loadJS(["/base_geoengine/static/lib/ol-7.2.2/ol.js"]);
        });

        onMounted(async () => {
            // This.createLayers();
            this.renderMap();
            this.renderVectorLayers();
        });
    }

    renderVectorLayers() {}

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
            this.setupControls();
        }
    }

    setupControls() {
        /* This.zoomToExtent = new ol.control.ZoomToExtent({
                extent: [
                    813079.7791264898, 5929220.284081122, 848966.9639063801,
                    5936863.986909639,
                ],
            });

            this.map.addControl(zoomToExtent)*/
        const fullscreen = new ol.control.FullScreen();
        const scaleLine = new ol.control.ScaleLine();
        this.map.addControl(fullscreen);
        this.map.addControl(scaleLine);
    }
}

GeoengineRenderer.template = "base_geoengine.GeoengineRenderer";
