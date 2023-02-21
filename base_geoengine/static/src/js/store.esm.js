/** @odoo-module */
const {reactive} = owl;

class Store {
    addLayers(layers) {
        this.backgrounds = layers;
    }

    get layers() {
        return this.backgrounds;
    }

    setMap(map) {
        this.map = map;
    }

    setVisibleLayer(givenLayer) {
        this.map
            .getLayers()
            .getArray()
            .find((layer) => layer.get("title") == "Base maps")
            .getLayers()
            .getArray()
            .forEach((layer) => {
                if (layer.get("title") === givenLayer.name) {
                    layer.setVisible(true);
                } else {
                    layer.setVisible(false);
                }
            });
    }
}
export const store = reactive(new Store());
