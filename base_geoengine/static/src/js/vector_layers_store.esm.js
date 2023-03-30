/** @odoo-module */
const {reactive} = owl;

class VectorLayersStore {
    /**
     * This is called when a vector layer is changed. This will notify observers of the change.
     * @param {*} newRastersLayer
     */
    onVectorLayerChanged(newVectorsLayers) {
        this.vectors = newVectorsLayers;
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
            Object.defineProperty(vector, "onDomainChanged", {
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

export const vectorLayersStore = reactive(new VectorLayersStore());
