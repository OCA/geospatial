/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {CheckBox} from "@web/core/checkbox/checkbox";
import {rasterLayersStore} from "../../../raster_layers_store.esm";
import {vectorLayersStore} from "../../../vector_layers_store.esm";
import {useOwnedDialogs, useService} from "@web/core/utils/hooks";
import {DomainSelectorGeoFieldDialog} from "../../../widgets/domain_selector_geo_field/domain_selector_geo_field_dialog/domain_selector_geo_field_dialog.esm";

const {Component, onWillStart} = owl;

export class LayersPanel extends Component {
    setup() {
        super.setup();

        this.orm = useService("orm");
        this.actionService = useService("action");
        this.view = useService("view");

        this.addDialog = useOwnedDialogs();

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
            this.geoengine_layers = result;

            // Set layers in the store
            rasterLayersStore.setRasters(this.geoengine_layers.backgrounds);
            vectorLayersStore.setVectors(this.geoengine_layers.actives);
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
    onVectorChange(layer, action, value) {
        const indexVector = vectorLayersStore
            .getVectors()
            .findIndex((vector) => vector.name === layer.name);
        const newVectors = vectorLayersStore.getVectors().map((item, index) => {
            if (index === indexVector) {
                switch (action) {
                    case "onDomainChanged":
                        item.model_domain = value;
                        item.onDomainChanged = true;
                        break;
                    case "onVisibleChanged":
                        item.isVisible = value;
                        break;
                }
            }
            return item;
        });
        vectorLayersStore.onVectorLayerChanged(newVectors);
    }

    /**
     * Returns whether the layer is visible or not.
     * @param {*} layer
     * @returns
     */
    getVisibleLayer(layer) {
        return layer.isVisible;
    }

    onEditFilterButtonSelected(vector) {
        this.addDialog(DomainSelectorGeoFieldDialog, {
            resModel: vector.model,
            initialValue: vector.model_domain,
            readonly: false,
            isDebugMode: Boolean(this.env.debug),
            model: vector,
            update: this.onVectorChange,
            onSelected: this.onSelected,
            title: "Domain editing",
        });
    }

    async onEditButtonSelected(vector) {
        console.log(vector);
        // Let res = await this.orm.call(vector.resModel, "env.ref", ["geo_vector_geoengine_view_form"]);
        // console.log(res);
        // // const {views} = await this.view.loadViews({resModel: vector.resModel, views: [[false, "form"]]});
        // // this.actionService.doAction({
        // //     type: "ir.actions.act_window",
        // //     res_model: vector.resModel,
        // //     views: [[views.form.id, "form"]],
        // //     res_id: vector.id,
        // //     target: 'new',
        // // });
    }

    onSelected(value) {
        this.update(this.model, "onDomainChanged", value);
    }
}

LayersPanel.template = "base_geoengine.LayersPanel";
LayersPanel.props = {
    model: {type: String, optional: false},
};
LayersPanel.components = {CheckBox};
