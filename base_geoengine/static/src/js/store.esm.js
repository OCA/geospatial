/** @odoo-module */
const {reactive} = owl;

class Store {
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

    /**
     * This is called when a vector layer is changed. This will notify observers of the change.
     * @param {*} newRastersLayer
     */
    onVectorLayerChanged(newVectorsLayers) {
        this.vectors = newVectorsLayers;
    }

    getRasters() {
        return this.rasters;
    }
    /**
     * Set vector layers to the store.
     * @param {*} rasters
     */
    setVectors(vectors) {
        const newVectors = vectors.map((vector) => {
            Object.defineProperty(vector, "isVisible", {
                value: false,
                writable: true,
            });
            if (vector.active_on_startup) {
                vector.isVisible = true;
            }
            return vector;
        });
        this.vectors = newVectors;
    }

    getVectors() {
        return this.vectors;
    }
}
export const store = reactive(new Store());
