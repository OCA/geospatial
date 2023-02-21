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
            store.addLayers(this.geoengine_layers);
        });
    }

    onRasterChange(layer) {
        store.setVisibleLayer(layer);
    }

    onVectorChange(vector) {
        console.log(vector);
    }

    getVisibleLayer(layer) {
        return !layer.overlay;
    }
}

LayersPanel.template = "base_geoengine.LayersPanel";
LayersPanel.components = {CheckBox};
