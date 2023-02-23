/** @odoo-module */
const {reactive} = owl;

class Store {
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

    onRasterLayerChanged(newRastersLayer) {
        this.rasters = newRastersLayer;
    }

    onVectorLayerChanged(newVectorsLayers) {
        this.vectors = newVectorsLayers;
    }

    getRasters() {
        return this.rasters;
    }

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
