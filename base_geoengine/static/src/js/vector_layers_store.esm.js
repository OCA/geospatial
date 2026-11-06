/** @odoo-module */
import {reactive} from "@odoo/owl";

class VectorLayersStore {
    /**
     * Set vector layers to the store.
     * @param {*} vectors
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

    get vectorsLayers() {
        return this.vectors;
    }

    getVector(resId) {
        return this.vectors.find((el) => el.resId === resId);
    }

    get count() {
        return this.vectors.length;
    }
}

export const vectorLayersStore = reactive(new VectorLayersStore());
