/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {loadBundle, templates} from "@web/core/assets";
import {GeoengineRecord} from "../geoengine_record/geoengine_record.esm";
import {LayersPanel} from "../layers_panel/layers_panel.esm";
import {RecordsPanel} from "../records_panel/records_panel.esm";
import {rasterLayersStore} from "../../../raster_layers_store.esm";
import {vectorLayersStore} from "../../../vector_layers_store.esm";
import {useService} from "@web/core/utils/hooks";
import {registry} from "@web/core/registry";
import {RelationalModel} from "@web/views/relational_model";
import {evaluateExpr} from "@web/core/py_js/py";
import {
    Component,
    mount,
    onMounted,
    onPatched,
    onWillStart,
    onWillUpdateProps,
    reactive,
    useState,
} from "@odoo/owl";

/* CONSTANTS */
const DEFAULT_BEGIN_COLOR = "#FFFFFF";
const DEFAULT_END_COLOR = "#000000";
const DEFAULT_MIN_SIZE = 5;
const DEFAULT_MAX_SIZE = 15;
// For choroplets only
const DEFAULT_NUM_CLASSES = 5;
const LEGEND_MAX_ITEMS = 10;

export class GeoengineRenderer extends Component {
    setup() {
        this.state = useState({selectedFeatures: [], isModified: false, isFit: false});
        this.models = [];
        this.cfg_models = [];
        this.vectorModel = {};
        this.legends = [];

        // When a change is issued in the rasterLayersStore or the vectorLayersStore the LayerChanged method is called.
        this.rasterLayersStore = reactive(rasterLayersStore, () =>
            this.onRasterLayerChanged()
        );
        this.vectorLayersStore = reactive(vectorLayersStore, () =>
            this.onVectorLayerChanged()
        );

        this.orm = useService("orm");
        this.view = useService("view");
        this.user = useService("user");

        // For related model we need to load all the service needed by RelationalModel
        this.services = {};
        for (const key of RelationalModel.services) {
            this.services[key] = useService(key);
        }

        onWillStart(async () =>
            Promise.all([
                loadBundle({
                    jsLibs: [
                        "/base_geoengine/static/lib/ol-7.2.2/ol.js",
                        "/base_geoengine/static/lib/chromajs-2.4.2/chroma.js",
                        "/base_geoengine/static/lib/geostats-2.0.0/geostats.js",
                    ],
                    cssLibs: ["/base_geoengine/static/lib/geostats-2.0.0/geostats.css"],
                }),
                this.loadVectorModel(),
                (this.isGeoengineAdmin = await this.user.hasGroup(
                    "base_geoengine.group_geoengine_admin"
                )),
            ])
        );

        onMounted(() => {
            // Retrives all vector layers in the store.
            this.geometryFields = this.vectorLayersStore.vectorsLayers.map(
                (layer) => layer.geo_field_id[1]
            );

            this.vectorSources = [];
            this.renderMap();
            this.renderVectorLayers();
        });

        onWillUpdateProps((nextProps) => {
            document.getElementById("map-legend").textContent = "";
            if (nextProps.isSavedOrDiscarded) {
                this.state.isModified = false;
            }
        });

        onPatched(() => {
            if (this.map !== undefined && !this.state.isModified) {
                this.renderVectorLayers();
            }
        });
    }

    async loadVectorModel() {
        await this.loadView("geoengine.vector.layer", "form");
    }

    renderMap() {
        if (!this.map) {
            this.createOverlay();
            this.map = new ol.Map({
                target: "olmap",
                layers: [
                    new ol.layer.Group({
                        title: "Base maps",
                        layers: this.createBackgroundLayers(
                            this.rasterLayersStore.rastersLayers
                        ),
                    }),
                ],
                overlays: [this.overlay],
            });
            this.map.on("moveend", () => {
                const newZoom = this.map.getView().getZoom();
                if (newZoom !== localStorage.getItem("ol-zoom")) {
                    localStorage.setItem("ol-zoom", newZoom);
                }
            });
            this.addMoveEndListenerToMap();
            this.format = new ol.format.GeoJSON({
                dataProjection: this.map.getView().getProjection(),
            });
            this.setupControls();
            this.registerInteraction();
        }
    }

    addMoveEndListenerToMap() {
        this.map.on("moveend", () => {
            const newZoom = this.map.getView().getZoom();
            if (newZoom !== localStorage.getItem("ol-zoom")) {
                localStorage.setItem("ol-zoom", newZoom);
            }
        });
    }

    /**
     * Create the info-box overlay that can be displayed over the map and
     * attached to a single map location.
     */
    createOverlay() {
        this.overlay = new ol.Overlay({
            element: document.getElementById("popup"),
            autoPan: {
                animation: {
                    duration: 250,
                },
            },
        });
    }

    createBackgroundLayers(backgrounds) {
        const source = [];
        source.push(new ol.layer.Tile({source: new ol.source.OSM()}));
        const backgroundLayers = backgrounds.map((background) => {
            switch (background.raster_type) {
                case "osm":
                    return new ol.layer.Tile({
                        title: background.name,
                        visible: !background.overlay,
                        type: "base",
                        source: new ol.source.OSM(),
                    });
                case "wmts":
                    const {source_opt, tilegrid_opt, layer_opt} =
                        this.createOptions(background);
                    this.getUrl(background, source_opt);
                    if (background.format_suffix) {
                        source_opt.format = background.format_suffix;
                    }
                    if (background.request_encoding) {
                        source_opt.request_encoding = background.request_encoding;
                    }
                    if (background.projection) {
                        source_opt.projection = ol.proj.get(background.projection);
                        if (source_opt.projection) {
                            const projectionExtent = source_opt.projection.getExtent();
                            tilegrid_opt.origin =
                                ol.extent.getTopLeft(projectionExtent);
                        }
                    }
                    if (background.resolutions) {
                        tilegrid_opt.resolutions = background.resolutions
                            .split(",")
                            .map(Number);
                        const nbRes = tilegrid_opt.resolutions.length;
                        const matrixIds = new Array(nbRes);
                        for (let i = 0; i < nbRes; i++) {
                            matrixIds[i] = i;
                        }
                        tilegrid_opt.matrixIds = matrixIds;
                    }
                    if (background.max_extent) {
                        const extent = background.max_extent.split(",").map(Number);
                        layer_opt.extent = extent;
                        tilegrid_opt.extent = extent;
                    }
                    if (background.params) {
                        source_opt.dimensions = JSON.parse(background.params);
                    }
                    source_opt.tileGrid = new ol.tilegrid.WMTS(tilegrid_opt);
                    layer_opt.source = new ol.source.WMTS(source_opt);
                    return new ol.layer.Tile(layer_opt);
                case "d_wms":
                    const source_opt_wms = {
                        params: JSON.parse(background.params_wms),
                        serverType: background.server_type,
                    };
                    const urls = background.url.split(",");
                    if (urls.length > 1) {
                        source_opt_wms.urls = urls;
                    } else {
                        source_opt_wms.url = urls[0];
                    }
                    return new ol.layer.Tile({
                        title: background.name,
                        visible: !background.overlay,
                        source: new ol.source.TileWMS(source_opt_wms),
                    });
                default:
                    return undefined;
            }
        });
        return source.concat(backgroundLayers);
    }

    getUrl(background, source_opt) {
        const urls_wmts = background.url.split(",");
        if (urls_wmts.length > 1) {
            source_opt.urls = urls_wmts;
        } else {
            source_opt.url = urls_wmts[0];
        }
    }

    createOptions(background) {
        const tilegrid_opt = {};
        const source_opt = {
            layer: background.name,
            matrixSet: background.matrix_set,
        };
        const layer_opt = {
            title: background.name,
            visible: !background.overlay,
            type: "base",
            style: "default",
        };
        return {source_opt, tilegrid_opt, layer_opt};
    }

    /**
     * Add 'ScaleLine' control.
     */
    setupControls() {
        if (this.props.editable && this.isGeoengineAdmin) {
            this.createDrawControl();
            this.createSelectControl();
            this.createEditControl();
        }
        const scaleLine = new ol.control.ScaleLine();
        this.map.addControl(scaleLine);
    }

    createEditControl() {
        const {element, button} = this.createHtmlControl(
            '<i class="fa fa-magic"></i>',
            "edit-control ol-unselectable ol-control"
        );

        button.addEventListener("click", () => {
            this.hidePopup();
            this.addSelectedClassToButton(button);
            this.removeDrawInteraction();
            this.removeSelectInteraction();

            if (
                this.modifyClick === undefined &&
                this.modifyInteraction === undefined
            ) {
                this.modifyClick = new ol.interaction.Select({
                    condition: ol.events.condition.click,
                    filter: (feature) => !feature.get("model"),
                });
                this.modifyInteraction = new ol.interaction.Modify({
                    features: this.modifyClick.getFeatures(),
                });
                this.modifyInteraction.on("modifyend", async (ev) => {
                    this.state.isModified = true;
                    const resId = ev.features.getArray()[0].getId();
                    const record = this.props.data.records.find(
                        (el) => el.resId === resId
                    );
                    await record.switchMode("edit");
                    const value = this.format.writeGeometry(
                        ev.features.getArray()[0].getGeometry()
                    );
                    this.props.updateRecord(value);
                });
                this.map.addInteraction(this.modifyClick);
                this.map.addInteraction(this.modifyInteraction);
            }
        });

        const EditControl = new ol.control.Control({
            element: element,
        });
        this.map.addControl(EditControl);
    }

    createDrawControl() {
        const {element, button} = this.createHtmlControl(
            '<i class="fa fa-pencil"></i>',
            "draw-control ol-unselectable ol-control"
        );
        button.addEventListener("click", () => {
            this.hidePopup();
            this.addSelectedClassToButton(button);
            this.removeModifyInteraction();
            this.removeSelectInteraction();
            if (this.props.data.editedRecord !== null) {
                this.props.onClickDiscard();
            }
            if (this.drawInteraction === undefined) {
                const key = Object.keys(this.props.data.fields).find(
                    (el) => this.props.data.fields[el].geo_type !== undefined
                );
                this.drawInteraction = new ol.interaction.Draw({
                    type: this.props.data.fields[key].geo_type.geo_type,
                    source: new ol.source.Vector(),
                });
                this.map.addInteraction(this.drawInteraction);
                this.drawInteraction.on("drawstart", () => {
                    this.props.onDrawStart();
                });

                this.drawInteraction.on("drawend", (ev) => {
                    this.props.createRecord(
                        this.props.data.resModel,
                        key,
                        new ol.format.GeoJSON().writeGeometry(ev.feature.getGeometry())
                    );
                });
            }
        });

        const DrawControl = new ol.control.Control({
            element: element,
        });
        this.map.addControl(DrawControl);
    }

    createSelectControl() {
        const {element, button} = this.createHtmlControl(
            '<i class="fa fa-mouse-pointer"></i>',
            "select-control ol-unselectable ol-control"
        );
        this.addSelectedClassToButton(button);

        button.addEventListener("click", () => {
            this.addSelectedClassToButton(button);
            this.removeDrawInteraction();
            this.removeModifyInteraction();
            if (this.props.data.editedRecord !== null) {
                this.props.onClickDiscard();
            }
            if (
                this.selectPointerMove === undefined &&
                this.selectClick === undefined
            ) {
                this.registerInteraction();
            }
        });

        const SelectControl = new ol.control.Control({
            element: element,
        });
        this.map.addControl(SelectControl);
    }

    addSelectedClassToButton(button) {
        document
            .querySelectorAll(".selected-control")
            .forEach((el) => el.classList.remove("selected-control"));
        button.classList.add("selected-control");
    }

    removeDrawInteraction() {
        if (this.drawInteraction !== undefined) {
            this.map.removeInteraction(this.drawInteraction);
            this.drawInteraction = undefined;
        }
    }

    removeModifyInteraction() {
        if (this.modifyClick !== undefined && this.modifyInteraction !== undefined) {
            this.map.removeInteraction(this.modifyClick);
            this.map.removeInteraction(this.modifyInteraction);
            this.modifyClick = undefined;
            this.modifyInteraction = undefined;
        }
    }

    removeSelectInteraction() {
        if (this.selectClick !== undefined && this.selectPointerMove !== undefined) {
            this.map.removeInteraction(this.selectClick);
            this.map.removeInteraction(this.selectPointerMove);
            this.selectClick = undefined;
            this.selectPointerMove = undefined;
        }
    }

    createHtmlControl(innerHTML, className) {
        const button = document.createElement("button");
        button.innerHTML = innerHTML;
        const element = document.createElement("div");
        element.className = className;
        element.appendChild(button);
        return {element, button};
    }

    /**
     * Add 2 interactions. The first is for the hovering elements.
     * The second is for the click on the feature.
     */
    registerInteraction() {
        this.selectPointerMove = new ol.interaction.Select({
            condition: ol.events.condition.pointerMove,
            style: this.selectStyle,
        });
        this.selectClick = new ol.interaction.Select({
            condition: ol.events.condition.click,
            style: this.selectStyle,
        });

        this.selectClick.on("select", (e) => {
            const features = e.target.getFeatures();
            this.updateInfoBox(features);
        });
        this.map.addInteraction(this.selectClick);
        this.map.addInteraction(this.selectPointerMove);
    }

    /**
     * This is the style that is set when selecting or clicking on a feature.
     * @param {*} feature
     * @returns style
     */
    selectStyle(feature) {
        var geometryType = feature.getGeometry().getType();
        switch (geometryType) {
            case "Point":
                return new ol.style.Style({
                    image: new ol.style.Circle({
                        radius: 3 * 2,
                        fill: new ol.style.Fill({
                            color: [0, 153, 255, 1],
                        }),
                        stroke: new ol.style.Stroke({
                            color: [255, 255, 255, 1],
                            width: 3 / 2,
                        }),
                    }),
                    zIndex: Infinity,
                });
            case "MultiPolygon":
                return new ol.style.Style({
                    fill: new ol.style.Fill({
                        color: chroma(feature.values_.attributes.color)
                            .alpha(0.4)
                            .css(),
                    }),
                });
        }
    }
    /**
     * Allow you to display the info box on the map.
     * @param {*} features
     */
    updateInfoBox(features) {
        const feature = features.item(0);
        if (feature !== undefined) {
            const popup = this.getPopup();
            if (feature !== undefined) {
                var attributes = feature.get("attributes");

                if (this.cfg_models.includes(feature.get("model"))) {
                    const model = this.models.find(
                        (el) => el.model.resModel === feature.get("model")
                    );
                    this.mountGeoengineRecord({
                        popup,
                        archInfo: model.archInfo,
                        templateDocs: model.archInfo.templateDocs,
                        model: model.model,
                        attributes,
                    });
                } else {
                    this.mountGeoengineRecord({
                        popup,
                        archInfo: this.props.archInfo,
                        templateDocs: this.props.archInfo.templateDocs,
                        model: this.props.data,
                        attributes,
                    });
                }

                var coord = ol.extent.getCenter(feature.getGeometry().getExtent());
                this.overlay.setPosition(coord);
            }
        } else {
            this.hidePopup();
        }
    }

    getPopup() {
        const popup = document.getElementById("popup-content");
        if (popup.firstChild !== null) {
            popup.removeChild(popup.firstChild);
        }
        return popup;
    }

    /**
     * Allow you to mount geoengine record. This displays the record in the info box template.
     * @param {*} popup
     * @param {*} archInfo
     * @param {*} templateDocs
     * @param {*} model
     * @param {*} attributes
     * @param {*} record
     */
    mountGeoengineRecord({popup, archInfo, templateDocs, model, attributes, record}) {
        this.record =
            record === undefined
                ? model.records.find((record) => record._values.id === attributes.id)
                : record;
        mount(GeoengineRecord, popup, {
            env: this.env,
            props: {
                archInfo,
                record: this.record,
                templates: templateDocs,
            },
            templates,
        });
    }

    /**
     * When you click on a record in the RecordsPanel, this method is called to display the popup.
     * @param {*} record
     */
    onDisplayPopupRecord(record) {
        const popup = this.getPopup();
        const feature = this.vectorSource.getFeatureById(record.resId);
        if (feature !== undefined) {
            this.mountGeoengineRecord({
                popup,
                archInfo: this.props.archInfo,
                templateDocs: this.props.archInfo.templateDocs,
                record,
            });
            var coord = ol.extent.getCenter(feature.getGeometry().getExtent());
            this.overlay.setPosition(coord);
            var map_view = this.map.getView();
            if (map_view) {
                map_view.animate({
                    center: feature.getGeometry().getFirstCoordinate(),
                    duration: 500,
                });
            }
        }
    }

    zoomOnFeature(record) {
        const feature = this.vectorSource.getFeatureById(record.resId);
        var map_view = this.map.getView();
        if (map_view) {
            map_view.fit(feature.getGeometry(), {maxZoom: 14});
        }
    }

    getOriginalZoom() {
        var extent = this.vectorLayersResult
            .find((res) => res.values_.visible === true)
            .getSource()
            .getExtent();
        var infinite_extent = [Infinity, Infinity, -Infinity, -Infinity];
        if (extent !== infinite_extent) {
            var map_view = this.map.getView();
            if (map_view) {
                map_view.fit(extent, {maxZoom: 15});
            }
        }
    }

    /**
     * Allow you to hide the popup by clicking on the cross.
     */
    clickToHidePopup() {
        this.hidePopup();
    }

    hidePopup() {
        this.overlay.setPosition(undefined);
    }

    /**
     * When you click on the open button, it calls the controller's
     * openRecord method.
     */
    onInfoBoxClicked() {
        this.props.openRecord(this.record.resModel, this.record.resId);
    }

    /**
     * Allows you to change the visibility of layers. This method is called
     * when the user changes raster layers.
     */
    onRasterLayerChanged() {
        this.map
            .getLayers()
            .getArray()
            .find((layer) => layer.get("title") === "Base maps")
            .getLayers()
            .getArray()
            .forEach((layer) => {
                this.rasterLayersStore.rastersLayers.forEach((raster) => {
                    if (raster.name === layer.get("title")) {
                        layer.setVisible(raster.isVisible);
                    }
                });
            });
    }

    /**
     * Allows you to change the visibility of layers. This method is called
     * when the user changes vector layers.
     */
    async onVectorLayerChanged() {
        await this.map
            .getLayers()
            .getArray()
            .find((layer) => layer.get("title") === "Overlays")
            .getLayers()
            .getArray()
            .forEach((layer) => {
                this.vectorLayersStore.vectorsLayers.forEach(async (vector) => {
                    if (vector.name === layer.get("title")) {
                        if (vector.onVisibleChanged) {
                            this.onVisibleChanged(vector, layer);
                            const legend = document.getElementById(
                                `legend-${vector.resId}`
                            );
                            if (legend !== null) {
                                void (vector.isVisible
                                    ? (legend.style.display = "block")
                                    : (legend.style.display = "none"));
                            }
                        }
                        if (vector.onDomainChanged) {
                            this.onVectorLayerModelDomainChanged(vector, layer);
                        }
                        if (vector.onLayerChanged) {
                            await this.onLayerChanged(vector, layer);
                        }
                        if (vector.onSequenceChanged) {
                            this.onSequenceChanged(vector, layer);
                        }
                    }
                });
            });
    }

    /**
     * This method assigns a new priority to the layer according to the new sequence.
     * @param {*} vector
     * @param {*} layer
     */
    onSequenceChanged(vector, layer) {
        layer.setZIndex(vector.sequence);
    }

    /**
     * This method assing a new source to the layer according on the layer edited.
     * @param {*} vector
     * @param {*} layer
     */
    async onLayerChanged(vector, layer) {
        layer.setSource(null);
        const element = document.getElementById(`legend-${vector.resId}`);
        if (element !== null) {
            element.remove();
        }
        if (vector.model) {
            this.cfg_models.push(vector.model);
            const fields_to_read = [vector.geo_field_id[1]];
            if (vector.attribute_field_id) {
                fields_to_read.push(vector.attribute_field_id[1]);
            }
            const data = await this.getModelData(vector, fields_to_read);
            this.styleVectorLayerAndLegend(vector, data, layer);
            this.useRelatedModel(vector, layer, data);
        } else {
            const data = this.props.data.records;
            this.styleVectorLayerAndLegend(vector, data, layer);
            this.addSourceToLayer(data, vector, layer);
        }
    }

    /**
     * This method assigns the visibility received by the layer.
     * @param {*} vector
     * @param {*} layer
     */
    onVisibleChanged(vector, layer) {
        layer.setVisible(vector.isVisible);
    }

    /**
     * This method assigns a new source with the revalued domain.
     * @param {*} cfg
     * @param {*} layer
     */
    async onVectorLayerModelDomainChanged(vector, layer) {
        layer.setSource(null);
        const element = document.getElementById(`legend-${vector.resId}`);
        if (element !== null) {
            element.remove();
        }
        const fields_to_read = this.getFieldsToRead(vector);
        const data = await this.getModelData(vector, fields_to_read);
        this.useRelatedModel(vector, layer, data);
        const styleInfo = this.styleVectorLayer(vector, data);
        this.initLegend(styleInfo, vector);
    }

    async renderVectorLayers() {
        const vectorLayers = await this.createVectorLayers();
        this.vectorLayersResult = await Promise.all(vectorLayers);
        this.map.getLayers().forEach((layer) => {
            if (layer.get("title") === "Overlays") {
                this.map.removeLayer(layer);
            }
        });
        this.overlaysGroup = new ol.layer.Group({
            title: "Overlays",
            layers: this.vectorLayersResult,
        });
        this.vectorLayersResult.forEach((vlayer) => {
            this.vectorLayersStore.vectorsLayers.forEach((vector) => {
                if (vlayer.values_.title === vector.name) {
                    vlayer.setVisible(vector.isVisible);
                }
            });
        });
        this.map.addLayer(this.overlaysGroup);

        this.updateZoom();
    }

    /**
     * Adapts the zoom according to the result obtained.
     */
    updateZoom() {
        if (this.state.isFit) {
            this.map.getView().setZoom(localStorage.getItem("ol-zoom"));
        } else if (this.props.data.records.length) {
            this.getOriginalZoom();
            this.state.isFit = true;
        }
    }

    createVectorLayers() {
        return this.vectorLayersStore.vectorsLayers.map((layer) =>
            this.createVectorLayer(layer)
        );
    }

    async createVectorLayer(cfg) {
        var lv = new ol.layer.Vector({
            title: cfg.name,
            active_on_startup: cfg.active_on_startup,
        });
        // If we want to use an other model in the layer
        if (cfg.model) {
            this.cfg_models.push(cfg.model);
            const fields_to_read = this.getFieldsToRead(cfg);
            await this.loadView(cfg.model, "geoengine");
            const data = await this.getModelData(cfg, fields_to_read);
            this.styleVectorLayerAndLegend(cfg, data, lv);
            this.useRelatedModel(cfg, lv, data);
        } else {
            const data = this.props.data.records;
            if (!data.length) {
                return new ol.layer.Vector({
                    source: new ol.source.Vector(),
                    title: cfg.name,
                });
            }
            this.styleVectorLayerAndLegend(cfg, data, lv);
            this.addSourceToLayer(data, cfg, lv);
        }
        if (cfg.layer_opacity) {
            lv.setOpacity(cfg.layer_opacity);
        }
        lv.setZIndex(cfg.sequence);
        return lv;
    }

    getFieldsToRead(cfg) {
        const fields_to_read = [cfg.geo_field_id[1]];
        if (cfg.attribute_field_id) {
            fields_to_read.push(cfg.attribute_field_id[1]);
        }
        return fields_to_read;
    }

    async getModelData(cfg, fields_to_read) {
        const domain = this.evalModelDomain(cfg);
        let data = await this.orm.searchRead(cfg.model, [domain][0], fields_to_read);
        const modelsRecords = this.models.find((e) => e.model.resModel === cfg.model)
            .model.records;
        data = data.map((data) => modelsRecords.find((rec) => rec.resId === data.id));
        return data;
    }

    styleVectorLayerAndLegend(cfg, data, lv) {
        const styleInfo = this.styleVectorLayer(cfg, data);
        this.initLegend(styleInfo, cfg);
        lv.setStyle(styleInfo.style);
    }

    initLegend(styleInfo, cfg) {
        if (document.getElementById(`legend-${cfg.resId}`) === null) {
            const parentContainer = document.getElementById("map-legend");
            const containerLegend = document.createElement("div");
            if (styleInfo.legend !== "") {
                containerLegend.innerHTML = styleInfo.legend;
                containerLegend.setAttribute("id", `legend-${cfg.resId}`);
                containerLegend.className = "legend";
                if (cfg.isVisible) {
                    containerLegend.style.display = "block";
                }
                parentContainer.appendChild(containerLegend);
            }
        }
    }

    /**
     * This method is called when a layer uses another model.
     * @param {*} cfg
     * @param {*} lv
     */
    useRelatedModel(cfg, lv, res) {
        const vectorSource = new ol.source.Vector();
        this.addFeatureToSource(res, cfg, vectorSource);
        lv.setSource(vectorSource);
    }

    /**
     * Set source to the given layer.
     * @param {*} res
     * @param {*} cfg
     * @param {*} lv
     */
    addSourceToLayer(res, cfg, lv) {
        this.vectorSource = new ol.source.Vector();
        this.addFeatureToSource(res, cfg, this.vectorSource);
        lv.setSource(this.vectorSource);
    }

    /**
     * Evaluates the domain passed to the layer model.
     * @param {*} cfg
     * @returns {Array}
     */
    evalModelDomain(cfg) {
        let domain = [];
        // We can put active_ids in our domain to get all ids of all the
        // element displayed.
        if (cfg.model_domain.includes("{ACTIVE_IDS}")) {
            const start = cfg.model_domain.search("ACTIVE_IDS") - 2;
            let newDomain =
                cfg.model_domain.slice(0, start) + cfg.model_domain.slice(start + 2);
            const end = newDomain.search("ACTIVE_IDS") + 10;
            newDomain = newDomain.slice(0, end) + newDomain.slice(end + 2);
            newDomain = newDomain.replace("not in active_ids", "not in");
            newDomain = newDomain.replace("in active_ids", "in");
            domain = evaluateExpr(newDomain, {
                ACTIVE_IDS: this.props.data.records.map(
                    (datapoint) => `${datapoint.resId}`
                ),
            });
        } else {
            domain = evaluateExpr(cfg.model_domain);
        }
        return domain;
    }
    /**
     * Loads the model's view that is passed to the layer.
     * @param {*} model
     * @param {*} domain
     */
    async loadView(model, view) {
        const viewRegistry = registry.category("views");
        const fields = await this.view.loadFields(model, {
            attributes: [
                "store",
                "searchable",
                "type",
                "string",
                "relation",
                "selection",
                "related",
            ],
        });
        const {relatedModels, views} = await this.view.loadViews({
            resModel: model,
            views: [[false, view]],
        });
        const {ArchParser, Model} = viewRegistry.get(view);
        const archInfo = new ArchParser().parse(views[view].arch, relatedModels, model);

        if (model === "geoengine.vector.layer") {
            const notAllowedField = Object.keys(fields).filter(
                (field) =>
                    fields[field] !== undefined &&
                    fields[field].relation !== undefined &&
                    fields[field].relation === "ir.ui.view"
            );
            notAllowedField.forEach((field) => {
                delete field[field];
                delete archInfo.activeFields[field];
            });
        }
        const searchParams = {
            activeFields: archInfo.activeFields,
            resModel: model,
            fields: fields,
            limit: 10000,
        };
        if (model === "geoengine.vector.layer") {
            this.vectorModel = new RelationalModel(
                this.env,
                searchParams,
                this.services
            );
            await this.vectorModel.load();
        } else if (this.models.find((e) => e.model.resModel === model) === undefined) {
            const toLoadModel = new Model(this.env, searchParams, this.services);
            await toLoadModel.load().then(() => {
                this.models.push({model: toLoadModel.root, archInfo});
            });
        }
    }

    addFeatureToSource(data, cfg, vectorSource) {
        data.forEach((item) => {
            var attributes =
                item._values === undefined ? _.clone(item) : _.clone(item._values);
            this.geometryFields.forEach((geo_field) => delete attributes[geo_field]);

            if (cfg.display_polygon_labels === true) {
                attributes.label =
                    item._values === undefined
                        ? item[cfg.attribute_field_id[1]]
                        : item._values[cfg.attribute_field_id[1]];
            } else {
                attributes.label = "";
            }
            attributes.color = cfg.begin_color;

            const json_geometry =
                item._values === undefined
                    ? item[cfg.geo_field_id[1]]
                    : item._values[cfg.geo_field_id[1]];
            if (json_geometry) {
                const feature = new ol.Feature({
                    geometry: new ol.format.GeoJSON().readGeometry(json_geometry),
                    attributes: attributes,
                    model: cfg.model,
                });
                feature.setId(item.resId);

                vectorSource.addFeature(feature);
            }
        });
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

    styleVectorLayerColored(cfg, data) {
        var indicator = cfg.attribute_field_id[1];
        var values = this.extractLayerValues(cfg, data);
        var nb_class = cfg.nb_class || DEFAULT_NUM_CLASSES;
        var opacity = cfg.layer_opacity;
        var begin_color_hex = cfg.begin_color || DEFAULT_BEGIN_COLOR;
        var end_color_hex = cfg.end_color || DEFAULT_END_COLOR;
        var begin_color = chroma(begin_color_hex).alpha(opacity).css();
        var end_color = chroma(end_color_hex).alpha(opacity).css();
        // Function that maps numeric values to a color palette.
        // This scale function is only used when geo_repr is basic
        var scale = chroma.scale([begin_color, end_color]);
        var serie = new geostats(values);
        var vals = null;
        switch (cfg.classification) {
            case "unique":
            case "custom":
                vals = serie.getClassUniqueValues();
                // "RdYlBu" is a set of colors
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
                    return chroma(val).alpha(opacity).css();
                }
            });
        } else {
            colors = scale
                .colors(vals.length)
                .map((color) => chroma(color).alpha(opacity).css());
        }
        const styles_map = this.createStylesWithColors(colors);
        let legend = null;
        if (vals.length <= LEGEND_MAX_ITEMS) {
            legend = serie.getHtmlLegend(colors, cfg.name, 1);
        }
        return {
            style: (feature) => {
                const value = feature.get("attributes")[indicator];
                const color_idx = this.getClass(value, vals);
                var label_text = feature.values_.attributes.label;
                if (label_text === false) {
                    label_text = "";
                }
                console.log(feature.get("attributes").id);
                styles_map[colors[color_idx]][0].text_.text_ = label_text.toString();
                return styles_map[colors[color_idx]];
            },
            legend,
        };
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
        var color_hex = cfg.begin_color || DEFAULT_BEGIN_COLOR;
        var color = chroma(color_hex).alpha(cfg.layer_opacity).css();

        const {fill, stroke} = this.createFillAndStroke(color);

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
        const color_hex = cfg.begin_color || DEFAULT_BEGIN_COLOR;
        var color = chroma(color_hex).alpha(cfg.layer_opacity).css();
        // Basic

        const {fill, stroke} = this.createFillAndStroke(color);

        var olStyleText = this.createStyleText();
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
    createStyleText() {
        return new ol.style.Text({
            text: "",
            fill: new ol.style.Fill({
                color: "#000000",
            }),
            stroke: new ol.style.Stroke({
                color: "#FFFFFF",
                width: 5,
            }),
        });
    }

    /**
     * Create a feature style based on the color table.
     * @param {*} colors
     * @returns
     */
    createStylesWithColors(colors) {
        const styles_map = {};
        colors.forEach((color) => {
            if (color in styles_map) {
                return;
            }
            const {fill, stroke} = this.createFillAndStroke(color);
            var olStyleText = this.createStyleText();
            const styles = [
                new ol.style.Style({
                    image: new ol.style.Circle({
                        fill: fill,
                        stroke: stroke,
                        radius: 7,
                    }),
                    fill: fill,
                    stroke: stroke,
                    text: olStyleText,
                }),
            ];
            styles_map[color] = styles;
        });
        return styles_map;
    }

    createFillAndStroke(color) {
        const fill = new ol.style.Fill({
            color: color,
        });
        const stroke = new ol.style.Stroke({
            color: "#333333",
            width: 2,
        });
        return {fill, stroke};
    }
    /**
     * Allows you to find the index of the color to be used according to its value.
     * @param {*} val
     * @param {*} a
     * @returns {Number}
     */
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

    /**
     * Extracts the values of the field corresponding to the attribute field.
     * @param {*} cfg, the layer.
     * @param {*} data, all of the records
     * @returns {Array}
     */
    extractLayerValues(cfg, data) {
        var indicator = cfg.attribute_field_id[1];
        return data.map((item) => item._values[indicator]);
    }
}

GeoengineRenderer.template = "base_geoengine.GeoengineRenderer";
GeoengineRenderer.props = {
    isSavedOrDiscarded: {type: Boolean},
    archInfo: {type: Object},
    data: {type: Object},
    openRecord: {type: Function},
    editable: {type: Boolean, optional: true},
    updateRecord: {type: Function},
    onClickDiscard: {type: Function},
    createRecord: {type: Function},
    onDrawStart: {type: Function},
};
GeoengineRenderer.components = {LayersPanel, GeoengineRecord, RecordsPanel};
