/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {CheckBox} from "@web/core/checkbox/checkbox";
import {Component, onWillStart, useRef, useState} from "@odoo/owl";
import {DomainSelectorGeoFieldDialog} from "../../../widgets/domain_selector_geo_field/domain_selector_geo_field_dialog/domain_selector_geo_field_dialog.esm";
import {FormViewDialog} from "@web/views/view_dialogs/form_view_dialog";
import {_t} from "@web/core/l10n/translation";
import {rasterLayersStore} from "../../../raster_layers_store.esm";
import {useOwnedDialogs, useService} from "@web/core/utils/hooks";
import {useSortable} from "@web/core/utils/sortable_owl";
import {vectorLayersStore} from "../../../vector_layers_store.esm";

export class LayersPanel extends Component {
    setup() {
        this.orm = useService("orm");
        this.actionService = useService("action");
        this.view = useService("view");
        this.rpc = useService("rpc");
        this.user = useService("user");
        this.state = useState({geoengineLayers: {}, isFolded: false});
        this.addDialog = useOwnedDialogs();

        /**
         * Call the model method "get_geoengine_layers" to get all the layers
         * in the database and add them to the store.
         */
        onWillStart(async () => {
            await Promise.all([this.loadIsAdmin(), this.loadLayers()]);
            /**
             * Get resId of records to allow resequence of elements.
             */
            this.state.geoengineLayers.actives.forEach((val) => {
                const element = this.props.vectorModel.records.find(
                    (el) => el.resId === val.id
                );
                const obj = {id: element.id, resId: element.resId};
                Object.assign(val, obj);
            });
            // Set layers in the store
            rasterLayersStore.setRasters(this.state.geoengineLayers.backgrounds);
            vectorLayersStore.setVectors(this.state.geoengineLayers.actives);
            this.numberOfLayers = vectorLayersStore.count + rasterLayersStore.count;
        });
        /**
         * Allows you to change the priority of the layer by sliding them over each other
         */
        let dataRowId = "";
        useSortable({
            ref: useRef("root"),
            elements: ".item",
            handle: ".fa-sort",
            onDragStart: (params) => {
                const {element} = params;
                dataRowId = element.dataset.id;
                this.sortStart(params);
            },
            onDragEnd: (params) => this.sortStop(params),
            onDrop: (params) => this.sort(dataRowId, params),
        });
    }

    sortStart({element}) {
        element.classList.add("shadow");
    }

    sortStop({element}) {
        element.classList.remove("shadow");
    }

    async loadIsAdmin() {
        return this.user
            .hasGroup("base_geoengine.group_geoengine_admin")
            .then((result) => {
                this.isGeoengineAdmin = result;
            });
    }

    async loadLayers() {
        return this.orm
            .call(this.props.model, "get_geoengine_layers", [])
            .then((result) => {
                this.state.geoengineLayers = result;
            });
    }

    async sort(dataRowId, {previous}) {
        const refId = previous ? previous.dataset.id : null;
        this.resquence(dataRowId, refId);
        if (this.isGeoengineAdmin) {
            await this.resequenceAndUpdate(dataRowId, refId);
        } else {
            this.state.geoengineLayers.actives.forEach((element, index) => {
                this.onVectorChange(element, "onSequenceChanged", index + 1);
            });
        }
    }

    /**
     * Resequence the order of layers but not update them (When a user modify them).
     * @param {*} dataRowId
     * @param {*} refId
     */
    resquence(dataRowId, refId) {
        const fromIndex = this.state.geoengineLayers.actives.findIndex(
            (r) => r.id === dataRowId
        );
        let toIndex = 0;
        if (refId !== null) {
            const targetIndex = this.state.geoengineLayers.actives.findIndex(
                (r) => r.id === refId
            );
            toIndex = fromIndex > targetIndex ? targetIndex + 1 : targetIndex;
        }
        const [record] = this.state.geoengineLayers.actives.splice(fromIndex, 1);
        this.state.geoengineLayers.actives.splice(toIndex, 0, record);
    }
    /**
     * Resequence the order of layers and update them (When an admin modify them).
     * @param {*} dataRowId
     * @param {*} refId
     */
    async resequenceAndUpdate(dataRowId, refId) {
        this.resequencePromise = this.props.vectorModel.resequence(dataRowId, refId, {
            handleField: "sequence",
        });
        await this.resequencePromise;
        this.props.vectorModel.records.forEach((element) => {
            this.onVectorChange(element, "onSequenceChanged", element.data.sequence);
        });
    }

    /**
     * This is called when a raster layer is changed. The raster layer is set to visible and then
     * the method notifies the store of the change.
     * @param {*} layer
     * @param {*} value
     */
    onRasterChange(layer, value) {
        const rasterLayer = rasterLayersStore.getRaster(layer.id);
        if (value) {
            Object.assign(rasterLayer, {...value});
        }

        const indexRaster = rasterLayersStore.rastersLayers.findIndex(
            (raster) => raster.name === layer.name
        );
        const newRasters = rasterLayersStore.rastersLayers.map((item, index) => {
            if (index === indexRaster) {
                item.isVisible = true;
            } else {
                item.isVisible = false;
            }
            return item;
        });
        rasterLayersStore.onRasterLayerChanged(newRasters);
    }

    /**
     * This is called when a vector layer is changed. The vector layer is changed by an action and then
     * the method notifies the store of the change.
     * @param {*} layer
     * @param {*} action
     * @param {*} value
     */
    async onVectorChange(layer, action, value) {
        vectorLayersStore.vectorsLayers.forEach((lay) => {
            lay.onDomainChanged = false;
            lay.onLayerChanged = false;
            lay.onSequenceChanged = false;
        });
        const vectorLayer = vectorLayersStore.getVector(layer.resId);
        switch (action) {
            case "onDomainChanged": {
                Object.assign(vectorLayer, {
                    model_domain: value,
                    onDomainChanged: true,
                });
                break;
            }
            case "onVisibleChanged": {
                Object.assign(vectorLayer, {isVisible: value, onVisibleChanged: true});
                break;
            }
            case "onLayerChanged": {
                const geo_field_id = await this.orm.call(
                    vectorLayer.resModel,
                    "set_field_real_name",
                    [value.geo_field_id]
                );
                const attribute_field_id = await this.orm.call(
                    vectorLayer.resModel,
                    "set_field_real_name",
                    [value.attribute_field_id]
                );
                value.geo_field_id = geo_field_id;
                value.attribute_field_id = attribute_field_id;
                Object.assign(vectorLayer, {...value, onLayerChanged: true});
                break;
            }
            case "onSequenceChanged": {
                if (vectorLayer !== undefined) {
                    Object.assign(vectorLayer, {
                        sequence: value,
                        onSequenceChanged: true,
                    });
                }
                break;
            }
        }
    }

    onEditFilterButtonSelected(vector) {
        this.addDialog(DomainSelectorGeoFieldDialog, {
            resModel: vector.model,
            initialValue: vector.model_domain,
            readonly: false,
            isDebugMode: Boolean(this.env.debug),
            model: vector,
            onSelected: (value) => this.onEditFilterDomainChanged(vector, value),
            title: _t("Domain editing"),
        });
    }

    async onEditFilterDomainChanged(vector, value) {
        if (this.isGeoengineAdmin) {
            const record = this.props.vectorModel.records.find(
                (el) => el.resId === vector.resId
            );
            await record.update({model_domain: value});
            await record.save();
        }
        this.onVectorChange(vector, "onDomainChanged", value);
    }

    async onEditButtonSelected(vector) {
        const view = await this.rpc("/web/action/load", {
            action_id: "base_geoengine.geo_vector_geoengine_view_action",
        });

        this.addDialog(FormViewDialog, {
            resModel: vector.resModel,
            title: _t("Editing vector layer"),
            viewId: view.view_id[0],
            resId: vector.resId,
            onRecordSaved: (record) =>
                this.onVectorChange(vector, "onLayerChanged", record.data),
        });
    }

    async onEditRasterButtonSelected(layer) {
        const view = await this.rpc("/web/action/load", {
            action_id: "base_geoengine.geo_engine_form_view_raster_action",
        });
        this.addDialog(FormViewDialog, {
            resModel: "geoengine.raster.layer",
            title: _t("Editing Raster Layer"),
            viewId: view.view_id[0],
            resId: layer.id,
            onRecordSaved: (record) => this.onRasterChange(layer, record.data),
        });
    }
    /**
     * This method allows you to open/close the panel.
     */
    fold() {
        this.state.isFolded = !this.state.isFolded;
    }

    async openNewRaster() {
        // Commented this for now
        // Unable to dynamically add new raster or reload the UI after saving
        // this.actionService.doAction({
        //     type: "ir.actions.act_window",
        //     res_model: "geoengine.raster.layer",
        //     views: [[false, "form"]],
        //     target: "new",
        //     context: {edit: false, create: false},
        // });

        // for now, redirect to raster tree
        this.actionService.doAction("base_geoengine.geo_engine_view_rater_action");
    }
}

LayersPanel.template = "base_geoengine.LayersPanel";
LayersPanel.props = {
    model: {type: String, optional: false},
    vectorModel: {type: Object, optional: false},
};
LayersPanel.components = {CheckBox};
