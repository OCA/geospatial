/** @odoo-module */
import {CheckBox} from "@web/core/checkbox/checkbox";
import {store} from "../../../store.esm";
import {useService} from "@web/core/utils/hooks";
const {Component, onWillStart} = owl;

export class LayersPanel extends Component {
    setup() {
        super.setup();

        this.orm = useService("orm");

        /**
         * Call the model method "get_geoengine_layers" to get all the layers in the database and add them to the store.
         */
        onWillStart(async () => {
            const result = await this.orm.call(
                this.props.model,
                "get_geoengine_layers",
                []
            );
            this.geoengine_layers = result;

            // Set layers in the store
            store.setRasters(this.geoengine_layers.backgrounds);
            store.setVectors(this.geoengine_layers.actives);
        });
    }

    /**
     * Is called when a raster layer is changed. The raster layer is set to visible and then
     * the method notifies the store of the change.
     * @param {*} layer
     */
    onRasterChange(layer) {
        const indexRaster = store
            .getRasters()
            .findIndex((raster) => raster.name === layer.name);
        const newRasters = store.getRasters().map((item, index) => {
            if (index !== indexRaster) {
                item.isVisible = false;
            } else {
                item.isVisible = true;
            }
            return item;
        });
        store.onRasterLayerChanged(newRasters);
    }

    /**
     * Is called when a vector layer is changed. The vector layer is set to visible and then
     * the method notifies the store of the change.
     * @param {*} layer
     */
    onVectorChange(layer) {
        console.log("je passe");
        const indexVector = store
            .getVectors()
            .findIndex((vector) => vector.name === layer.name);
        const newVectors = store.getVectors().map((item, index) => {
            if (index === indexVector) {
                item.isVisible = !item.isVisible;
            }
            return item;
        });
        store.onVectorLayerChanged(newVectors);
    }

    /**
     * Returns wether the layer is visible or not.
     * @param {*} layer
     * @returns
     */
    getVisibleLayer(layer) {
        return layer.isVisible;
    }
}

LayersPanel.template = "base_geoengine.LayersPanel";
LayersPanel.components = {CheckBox};
