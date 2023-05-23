/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {CheckBox} from "@web/core/checkbox/checkbox";
import {rasterLayersStore} from "../../../raster_layers_store.esm";
import {vectorLayersStore} from "../../../vector_layers_store.esm";
import {useOwnedDialogs, useService} from "@web/core/utils/hooks";
import {DomainSelectorGeoFieldDialog} from "../../../widgets/domain_selector_geo_field/domain_selector_geo_field_dialog/domain_selector_geo_field_dialog.esm";
import {FormViewDialog} from "@web/views/view_dialogs/form_view_dialog";
import {useSortable} from "@web/core/utils/sortable";

import {Component, onWillStart, useRef, useState} from "@odoo/owl";

export class LayersPanel extends Component {
    setup() {
        this.orm = useService("orm");
        this.actionService = useService("action");
        this.view = useService("view");
        this.rpc = useService("rpc");
        this.user = useService("user");
        this.state = useState({geoengineLayers: {}, isFolded: false});
        this.addDialog = useOwnedDialogs();
        let dataRowId = "";

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
        useSortable({
            ref: useRef("root"),
            elements: ".item",
            handle: ".fa-sort",
            onDragStart({element}) {
                dataRowId = element.dataset.id;
            },
            onDrop: (params) => this.sort(dataRowId, params),
        });
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
     */
    onRasterChange(layer) {
        const indexRaster = rasterLayersStore.rastersLayers.findIndex(
            (raster) => raster.name === layer.name
        );
        const newRasters = rasterLayersStore.rastersLayers.map((item, index) => {
            if (index !== indexRaster) {
                item.isVisible = false;
            } else {
                item.isVisible = true;
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
        vectorLayersStore.vectorsLayers.forEach((layer) => {
            layer.onDomainChanged = false;
            layer.onLayerChanged = false;
            layer.onSequenceChanged = false;
        });
        const vectorLayer = vectorLayersStore.getVector(layer.resId);
        switch (action) {
            case "onDomainChanged":
                Object.assign(vectorLayer, {
                    model_domain: value,
                    onDomainChanged: true,
                });
                break;
            case "onVisibleChanged":
                Object.assign(vectorLayer, {isVisible: value, onVisibleChanged: true});
                break;
            case "onLayerChanged":
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
            case "onSequenceChanged":
                if (vectorLayer !== undefined) {
                    Object.assign(vectorLayer, {
                        sequence: value,
                        onSequenceChanged: true,
                    });
                }
                break;
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
            title: this.env._t("Domain editing"),
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
            title: this.env._t("Editing vector layer"),
            viewId: view.view_id[0],
            resId: vector.resId,
            onRecordSaved: (record) =>
                this.onVectorChange(vector, "onLayerChanged", record.data),
        });
    }
    /**
     * This method allows you to open/close the panel.
     */
    fold() {
        this.state.isFolded = !this.state.isFolded;
    }
}

LayersPanel.template = "base_geoengine.LayersPanel";
LayersPanel.props = {
    model: {type: String, optional: false},
    vectorModel: {type: Object, optional: false},
};
LayersPanel.components = {CheckBox};
