/** @odoo-module */
import {CheckBox} from "@web/core/checkbox/checkbox";
import {store} from "../../../store.esm";
import {useService} from "@web/core/utils/hooks";
const {Component, onWillStart} = owl;

export class LayersPanel extends Component {
    setup() {
        super.setup();
        this.orm = useService("orm");

        onWillStart(async () => {
            const result = await this.orm.call(
                this.props.model,
                "get_geoengine_layers",
                []
            );
            this.geoengine_layers = result;
            store.setRasters(this.geoengine_layers.backgrounds);
            store.setVectors(this.geoengine_layers.actives);
        });
    }

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

    onVectorChange(layer) {
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

    getVisibleLayer(layer) {
        return layer.isVisible;
    }
}

LayersPanel.template = "base_geoengine.LayersPanel";
LayersPanel.components = {CheckBox};
