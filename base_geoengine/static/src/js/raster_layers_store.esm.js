/** @odoo-module */

import {reactive} from "@odoo/owl";

class RasterLayersStore {
    /**
     * Set raster layers to the store.
     * @param {*} rasters
     */
    setRasters(rasters) {
        const newRasters = rasters.map((raster) => {
            Object.defineProperty(raster, "isVisible", {
                value: false,
                writable: true,
            });
            raster.isVisible = !raster.overlay;
            return raster;
        });
        this.rasters = newRasters;
    }

    /**
     * This is called when a raster layer is changed. This will notify observers of the change.
     * @param {*} newRastersLayer
     */
    onRasterLayerChanged(newRastersLayer) {
        this.rasters = newRastersLayer;
    }

    get rastersLayers() {
        return this.rasters;
    }

    getRaster(id) {
        return this.rasters.find((el) => el.id === id);
    }

    get count() {
        return this.rasters.length;
    }
}
export const rasterLayersStore = reactive(new RasterLayersStore());
