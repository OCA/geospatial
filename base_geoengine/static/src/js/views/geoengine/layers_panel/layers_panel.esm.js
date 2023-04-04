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

const {Component, onWillStart, useState, useRef} = owl;

export class LayersPanel extends Component {
    setup() {
        super.setup();

        this.orm = useService("orm");
        this.actionService = useService("action");
        this.view = useService("view");
        this.rpc = useService("rpc");
        this.state = useState({geoengineLayers: {}});
        this.addDialog = useOwnedDialogs();
        let dataRowId = "";

        /**
         * Call the model method "get_geoengine_layers" to get all the layers
         * in the database and add them to the store.
         */
        onWillStart(async () => {
            const result = await this.orm.call(
                this.props.model,
                "get_geoengine_layers",
                []
            );
            this.state.geoengineLayers = result;

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
        });

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

    async sort(dataRowId, {previous}) {
        const refId = previous ? previous.dataset.id : null;
        this.resequencePromise = this.props.vectorModel.resequence(dataRowId, refId, {
            handleField: "sequence",
        });
        await this.resequencePromise;
        this.state.geoengineLayers.actives.sort(
            (a, b) =>
                this.props.vectorModel.records.find((el) => el.resId === a.resId).data
                    .sequence -
                this.props.vectorModel.records.find((el) => el.resId === b.resId).data
                    .sequence
        );
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
        const indexRaster = rasterLayersStore
            .getRasters()
            .findIndex((raster) => raster.name === layer.name);
        const newRasters = rasterLayersStore.getRasters().map((item, index) => {
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
                Object.assign(vectorLayer, {sequence: value, onSequenceChanged: true});
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
            onSelected: (value) =>
                this.onVectorChange(vector, "onDomainChanged", value),
            title: this.env._t("Domain editing"),
        });
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
}

LayersPanel.template = "base_geoengine.LayersPanel";
LayersPanel.props = {
    model: {type: String, optional: false},
    vectorModel: {type: Object, optional: false},
};
LayersPanel.components = {CheckBox};
