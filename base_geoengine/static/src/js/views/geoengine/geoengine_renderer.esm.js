/** @odoo-module */
import {loadCSS, loadJS} from "@web/core/assets";
import {LayersPanel} from "./layers_panel/layers_panel.esm";
import {store} from "../../store.esm";
import {useService} from "@web/core/utils/hooks";
const {Component, onWillStart, onMounted, onRendered, reactive} = owl;

/* CONSTANTS */
const DEFAULT_BEGIN_COLOR = "#FFFFFF";
const DEFAULT_END_COLOR = "#000000";
// For prop symbols only
const DEFAULT_MIN_SIZE = 5;
// For prop symbols only
const DEFAULT_MAX_SIZE = 15;
// For choroplets only
const DEFAULT_NUM_CLASSES = 5;

export class GeoengineRenderer extends Component {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.store = reactive(store, () => this.onLayerChanged());

        onWillStart(() => Promise.all([this.loadJsFiles(), this.loadCssFiles()]));

        onMounted(async () => {
            this.geometryFields = this.store
                .getVectors()
                .map((layer) => layer.geo_field_id[1]);
            this.vectorSources = [];
            this.renderMap();
            this.renderVectorLayers();
        });

        onRendered(() => {
            if (this.map !== undefined) {
                this.renderVectorLayers();
            }
        });
    }
    async loadJsFiles() {
        const files = [
            "/base_geoengine/static/lib/ol-7.2.2/ol.js",
            "/base_geoengine/static/lib/chromajs-2.4.2/chroma.js",
            "/base_geoengine/static/lib/geostats-2.0.0/geostats.js",
        ];
        for (const file of files) {
            await loadJS(file);
        }
    }

    async loadCssFiles() {
        await Promise.all(
            ["/base_geoengine/static/lib/geostats-2.0.0/geostats.css"].map((file) =>
                loadCSS(file)
            )
        );
    }
    onLayerChanged() {
        this.map
            .getLayers()
            .getArray()
            .find((layer) => layer.get("title") === "Base maps")
            .getLayers()
            .getArray()
            .forEach((layer) => {
                this.store.getRasters().forEach((raster) => {
                    if (raster.name === layer.get("title")) {
                        layer.setVisible(raster.isVisible);
                    }
                });
            });

        this.map
            .getLayers()
            .getArray()
            .find((layer) => layer.get("title") === "Overlays")
            .getLayers()
            .getArray()
            .forEach((layer) => {
                this.store.getVectors().forEach((vector) => {
                    if (vector.name === layer.get("title")) {
                        layer.setVisible(vector.isVisible);
                    }
                });
            });

        console.log(this.store.rasters);
    }
    styleVectorLayerColored(cfg, data) {
        var indicator = cfg.attribute_field_id[1];
        var values = this.extractLayerValues(cfg, data);
        var nb_class = cfg.nb_class || DEFAULT_NUM_CLASSES;
        var opacity = 0.8;
        var begin_color_hex = cfg.begin_color || DEFAULT_BEGIN_COLOR;
        var end_color_hex = cfg.end_color || DEFAULT_END_COLOR;
        var begin_color = chroma(begin_color_hex).alpha(opacity).css();
        var end_color = chroma(end_color_hex).alpha(opacity).css();
        var scale = chroma.scale([begin_color, end_color]);
        var serie = new geostats(values);
        var vals = null;
        switch (cfg.classification) {
            case "unique":
            case "custom":
                vals = serie.getClassUniqueValues();
                scale = chroma.scale("RdYlBu").domain([0, vals.length], vals.length);
                break;
            case "quantile":
                serie.getClassQuantile(nb_class);
                vals = serie.getRanges();
                scale = scale.domain([0, vals.length], vals.length);
                break;
            case "interval":
                serie.getClassEqInterval(nb_class);
                vals = serie.getRanges();
                scale = scale.domain([0, vals.length], vals.length);
                break;
        }
        let colors = [];
        if (cfg.classification === "custom") {
            colors = vals.map((val) => {
                if (val) {
                    chroma(val).alpha(opacity).css();
                }
            });
        } else {
            colors = scale.colors().map((color) => chroma(color).alpha(opacity).css());
        }
        const styles_map = {};
        colors.forEach((color) => {
            if (color in styles_map) {
                return;
            }
            const fill = new ol.style.Fill({
                color: color,
            });
            const stroke = new ol.style.Stroke({
                color: "#333333",
                width: 2,
            });
            const styles = [
                new ol.style.Style({
                    image: new ol.style.Circle({
                        fill: fill,
                        stroke: stroke,
                        radius: 7,
                    }),
                    fill: fill,
                    stroke: stroke,
                }),
            ];
            styles_map[color] = styles;
        });
        var legend = null;
        /* If (vals.length <= LEGEND_MAX_ITEMS) {
            serie.setColors(colors);
            legend = serie.getHtmlLegend(null, cfg.name, 1);
        };*/

        return {
            style: (feature) => {
                const value = feature.get("attributes")[indicator];
                const color_idx = this.getClass(value, vals);
                return styles_map[colors[color_idx]];
            },
            legend: legend,
        };
    }

    getClass(val, a) {
        // Classification uniqueValues
        var idx = a.indexOf(val);
        if (idx > -1) {
            return idx;
        }
        // Range classification
        var separator = " - ";
        for (var i = 0; i < a.length; i++) {
            // All classification except uniqueValues
            if (a[i].indexOf(separator) !== -1) {
                var item = a[i].split(separator);
                if (val <= parseFloat(item[1])) {
                    return i;
                }
            } else if (val === a[i]) {
                // Classification uniqueValues
                return i;
            }
        }
    }

    extractLayerValues(cfg, data) {
        var indicator = cfg.attribute_field_id[1];
        return data.map((item) => item._values[indicator]);
    }

    styleVectorLayerProportion(cfg, data) {
        var indicator = cfg.attribute_field_id[1];
        var values = this.extractLayerValues(cfg, data);
        var serie = new geostats(values);
        var styles_map = {};
        var minSize = cfg.min_size || DEFAULT_MIN_SIZE;
        var maxSize = cfg.max_size || DEFAULT_MAX_SIZE;
        var minVal = serie.min();
        var maxVal = serie.max();
        // TODO to be defined on cfg
        var opacity = 0.8;
        var color_hex = cfg.begin_color || DEFAULT_BEGIN_COLOR;
        var color = chroma(color_hex).alpha(opacity).css();
        var fill = new ol.style.Fill({
            color: color,
        });
        var stroke = new ol.style.Stroke({
            color: "#333333",
            width: 2,
        });
        values.forEach((value) => {
            if (value in styles_map) {
                return;
            }
            var proportion = (value - minVal) / (maxVal - minVal);
            var proportion_sized = proportion * (maxSize - minSize);
            var radius = proportion_sized + minSize;
            var styles = [
                new ol.style.Style({
                    image: new ol.style.Circle({
                        fill: fill,
                        stroke: stroke,
                        radius: radius,
                    }),
                    fill: fill,
                    stroke: stroke,
                }),
            ];
            styles_map[value] = styles;
        });
        return {
            style: (feature) => {
                var value = feature.get("attributes")[indicator];
                return styles_map[value];
            },
            legend: "",
        };
    }

    styleVectorLayerDefault(cfg) {
        const opacity = 0.8;
        const color_hex = cfg.begin_color || DEFAULT_BEGIN_COLOR;
        var color = chroma(color_hex).alpha(opacity).css();
        // Basic
        var fill = new ol.style.Fill({
            color: color,
        });
        var stroke = new ol.style.Stroke({
            color: "#333333",
            width: 2,
        });
        var olStyleText = new ol.style.Text({
            text: "",
            fill: new ol.style.Fill({
                color: "#000000",
            }),
            stroke: new ol.style.Stroke({
                color: "#FFFFFF",
                width: 5,
            }),
        });
        var styles = [
            new ol.style.Style({
                image: new ol.style.Circle({
                    fill: fill,
                    stroke: stroke,
                    radius: 5,
                }),
                fill: fill,
                stroke: stroke,
                text: olStyleText,
            }),
        ];
        return {
            style: (feature) => {
                var label_text = feature.values_.attributes.label;
                if (label_text === false) {
                    label_text = "";
                }
                styles[0].text_.text_ = label_text;
                return styles;
            },
            legend: "",
        };
    }

    styleVectorLayer(cfg, data) {
        switch (cfg.geo_repr) {
            case "colored":
                return this.styleVectorLayerColored(cfg, data);
            case "proportion":
                return this.styleVectorLayerProportion(cfg, data);
            default:
                return this.styleVectorLayerDefault(cfg);
        }
    }

    createVectorLayer(cfg, data) {
        if (!data.length) {
            return new ol.layer.Vector({
                source: new ol.source.Vector(),
                title: cfg.name,
            });
        }

        this.vectorSource = new ol.source.Vector();
        data.forEach((item) => {
            var attributes = _.clone(item._values);
            this.geometryFields.forEach((geo_field) => delete attributes[geo_field]);

            if (cfg.display_polygon_labels === true) {
                attributes.label = item[cfg.attribute_field_id[1]];
            } else {
                attributes.label = "";
            }

            const json_geometry = item._values[cfg.geo_field_id[1]];
            if (json_geometry) {
                const feature = new ol.Feature({
                    geometry: new ol.format.GeoJSON().readGeometry(json_geometry),
                    attributes: attributes,
                });

                /* Var id = String(attributes.id);
                this.ids[id] = item.id;*/
                this.vectorSource.addFeature(feature);
            }
        });
        const styleInfo = this.styleVectorLayer(cfg, data);
        var lv = new ol.layer.Vector({
            source: this.vectorSource,
            title: cfg.name,
            active_on_startup: cfg.active_on_startup,
            style: styleInfo.style,
        });
        this.vectorSources.push(this.vectorSource);
        if (cfg.layer_opacity) {
            lv.setOpacity(cfg.layer_opacity);
        }
        return lv;
    }

    createVectorLayers(data) {
        return this.store
            .getVectors()
            .map((layer) => this.createVectorLayer(layer, data));
    }

    updateMapZoom(zoom) {
        if (this.vectorSource) {
            var extent = this.vectorSource.getExtent();
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
        const data = this.props.data.records;
        this.map.getLayers().forEach((layer) => {
            if (layer.get("title") === "Overlays") {
                this.map.removeLayer(layer);
            }
        });
        const vectorLayers = this.createVectorLayers(data);
        this.overlaysGroup = new ol.layer.Group({
            title: "Overlays",
            layers: vectorLayers,
        });
        vectorLayers.forEach((vlayer) => {
            this.store.getVectors().forEach((vector) => {
                if (vlayer.values_.title === vector.name) {
                    vlayer.setVisible(vector.isVisible);
                }
            });
        });
        this.map.addLayer(this.overlaysGroup);

        if (data.length) {
            var extent = vectorLayers[0].getSource().getExtent();
            var infinite_extent = [Infinity, Infinity, -Infinity, -Infinity];
            if (extent !== infinite_extent) {
                var map_view = this.map.getView();
                if (map_view) {
                    map_view.fit(extent, {maxZoom: 15});
                }
            }
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
                        layers: this.createBackgroundLayers(this.store.getRasters()),
                    }),
                ],
                view: new ol.View({
                    center: [0, 0],
                    zoom: 2,
                }),
            });
            this.setupControls();
            this.onHover();
        }
    }

    createBackgroundLayers(backgrounds) {
        const backgroundLayers = backgrounds.map((background) => {
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
