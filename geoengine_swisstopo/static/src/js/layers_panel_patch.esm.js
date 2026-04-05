/** @odoo-module */

import {LayersPanel} from "@base_geoengine/js/views/geoengine/layers_panel/layers_panel.esm";
import {patch} from "@web/core/utils/patch";

patch(LayersPanel.prototype, {
    /**
     * Called when the user clicks "Ajouter Swisstopo".
     * Creates two Swisstopo raster layers for the current geoengine view,
     * then reloads the page to pick them up cleanly.
     */
    async onAddSwisstopo() {
        const viewId = this.state.geoengineLayers.geo_view_id;
        if (!viewId) {
            return;
        }
        await this.orm.call("geoengine.raster.layer", "action_add_swisstopo_layers", [
            viewId,
        ]);
        window.location.reload();
    },
});
