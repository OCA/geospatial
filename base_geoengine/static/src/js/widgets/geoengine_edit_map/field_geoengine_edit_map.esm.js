/** @odoo-module **/

import {loadJS} from "@web/core/assets";
import {registry} from "@web/core/registry";
import {useService} from "@web/core/utils/hooks";

const {Component, onWillStart, onMounted, onRendered} = owl;

export class FieldGeoEngineEditMap extends Component {
    setup() {
        super.setup();

        // Allows you to have a unique id if you put the same field in the view several times
        this.id = `map_${Date.now()}`;
        this.orm = useService("orm");

        onWillStart(async () => {
            return loadJS(["/base_geoengine/static/lib/ol-7.2.2/ol.js"]);
        });

        // Is executed when component is mounted.
        onMounted(async () => {
            const result = await this.orm.call(
                this.props.record.resModel,
                "get_edit_info_for_geo_column",
                [this.props.name]
            );
            this.projection = result.projection;
            this.defaultExtent = result.default_extent;
            this.defaultZoom = result.default_zoom;
            this.restrictedExtent = result.restricted_extent;
            this.srid = result.srid;
            this.createLayers();
            this.renderMap();
            this.setValue(this.props.value);
        });

        // Is executed after component is rendered.
        onRendered(() => {
            this.setValue(this.props.value);
        });
    }

    /**
     * Displays geo data on the map using the collection of features.
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

    /**
     * Call the method that create the layer to display the geo data on the map.
     */
    createLayers() {
        this.vectorLayer = this.createVectorLayer();
    }

    /**
     * Allows you to centre the area defined for the user.
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

    /**
     * Is executed after component is rendered.
     */
    updateMapEmpty() {
        var map_view = this.map.getView();
        if (map_view) {
            var extent = this.defaultExtent.replace(/\s/g, "").split(",");
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
            /**
             * If the value to be displayed is equal to the one passed in props do nothing
             * otherwise clear the map and displaye the new value.
             */
            if (this.displayValue == value) return;
            this.displayValue = value;
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

    /**
     * Is triggered when the view changed. When we have finished drawing our geo data or when we clear
     * the map.
     */
    onUIChange() {
        var value = null;
        if (this.geometry) {
            value = this.format.writeGeometry(this.geometry);
        }
        this.props.update(value);
    }

    /**
     * Allow you to setup the trash button and the draw interaction.
     */
    setupControls() {
        const drawInteraction = new ol.interaction.Draw({
            type: this.geoType,
            source: this.source,
        });
        this.map.addInteraction(drawInteraction);

        drawInteraction.on("drawend", (e) => {
            this.geometry = e.feature.getGeometry();
            this.onUIChange();
        });

        const element = this.createTrashControl();

        this.clearmapControl = new ol.control.Control({element: element});

        this.map.addControl(this.clearmapControl);
    }

    /**
     * Create the trash button that clear the map.
     * @returns the div in which the button is located.
     */
    createTrashControl() {
        const button = document.createElement("button");
        button.innerHTML = '<i class="fa fa-trash"/>';
        button.addEventListener("click", () => {
            this.source.clear();
            this.geometry = null;
            this.onUIChange();
        });
        const element = document.createElement("div");
        element.className = "ol-clear ol-unselectable ol-control";
        element.appendChild(button);
        return element;
    }

    /**
     * Displays the map in the div provided
     */
    renderMap() {
        this.map = new ol.Map({
            target: this.id,
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM(),
                }),
            ],
            view: new ol.View({
                center: [0, 0],
                zoom: 5,
            }),
        });
        this.map.addLayer(this.vectorLayer);
        this.format = new ol.format.GeoJSON({
            internalProjection: this.map.getView().getProjection(),
            externalProjection: "EPSG:" + this.srid,
        });
        this.setupControls();
    }
}

FieldGeoEngineEditMap.template = "base_geoengine.FieldGeoEngineEditMap";

export class FieldGeoEngineEditMapMultiPolygon extends FieldGeoEngineEditMap {
    setup() {
        this.geoType = "MultiPolygon";
        super.setup();
    }
}

export class FieldGeoEngineEditMapPolygon extends FieldGeoEngineEditMap {
    setup() {
        this.geoType = "Polygon";
        super.setup();
    }
}

export class FieldGeoEngineEditMapPoint extends FieldGeoEngineEditMap {
    setup() {
        this.geoType = "Point";
        super.setup();
    }
}

export class FieldGeoEngineEditMapMultiPoint extends FieldGeoEngineEditMap {
    setup() {
        this.geoType = "MultiPoint";
        super.setup();
    }
}

export class FieldGeoEngineEditMapLine extends FieldGeoEngineEditMap {
    setup() {
        this.geoType = "LineString";
        super.setup();
    }
}

export class FieldGeoEngineEditMapMultiLine extends FieldGeoEngineEditMap {
    setup() {
        this.geoType = "MultiLineString";
        super.setup();
    }
}

registry.category("fields").add("geo_multi_polygon", FieldGeoEngineEditMapMultiPolygon);
registry.category("fields").add("geo_polygon", FieldGeoEngineEditMapPolygon);
registry.category("fields").add("geo_point", FieldGeoEngineEditMapPoint);
registry.category("fields").add("geo_multi_point", FieldGeoEngineEditMapMultiPoint);
registry.category("fields").add("geo_line", FieldGeoEngineEditMapLine);
registry.category("fields").add("geo_multi_line", FieldGeoEngineEditMapMultiLine);
