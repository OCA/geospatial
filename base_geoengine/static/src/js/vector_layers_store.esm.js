/** @odoo-module */
const {reactive} = owl;

class VectorLayersStore {
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

    getVector(resId) {
        return this.vectors.find((el) => el.resId === resId);
    }
}

export const vectorLayersStore = reactive(new VectorLayersStore());
