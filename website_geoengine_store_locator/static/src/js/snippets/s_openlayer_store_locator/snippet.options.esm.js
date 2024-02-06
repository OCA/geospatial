/** @odoo-module **/
import options from "web_editor.snippets.options";

/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

options.registry.OpenLayerStoreLocator = options.Class.extend({
    jsLibs: [
        "/web/static/lib/Chart/Chart.js",
        "/website_geoengine_store_locator/static/lib/node_modules/ol/dist/ol.js",
        "/website_geoengine_store_locator/static/lib/node_modules/jquery-flexdatalist/jquery.flexdatalist.js",
    ],
    cssLibs: [
        "/website_geoengine_store_locator/static/styles.css",
        "/website_geoengine_store_locator/static/lib/node_modules/ol/ol.css",
        "/website_geoengine_store_locator/static/lib/node_modules/jquery-flexdatalist/jquery.flexdatalist.css",
    ],

    init() {
        return this._super.apply(this, arguments);
    },

    async onBuilt() {
        this._super.apply(this, arguments);
        this.element = this.$target[0];
        this.mapType = this.element.dataset.mapType;

        const storesSource = new ol.source.Vector();
        const stores = new ol.layer.Vector({
            source: storesSource,
        });
        this.mapElement = this.element.querySelector(".map");
        new ol.Map({
            target: this.mapElement,
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM({
                        url: {
                            mapnik: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                            cyclemap:
                                "https://tile.thunderforest.com/cycle/{z}/{x}/{y}@2x.png?apikey=...",
                            cyclosm:
                                "https://{a-c}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
                            mobility:
                                "https://tile.thunderforest.com/transport/{z}/{x}/{y}@2x.png?apikey=...",
                            topo: "https://tile.tracestrack.com/topo__/{z}/{x}/{y}.png?key=...",
                            hot: "https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
                        }[this.mapType],
                    }),
                }),
                stores,
            ],
            view: new ol.View({
                projection: "EPSG:3857",
                center: ol.proj.fromLonLat([6, 46]),
                zoom: 8,
            }),
        });
    },

    async selectDataAttribute(previewMode, widgetValue, params) {
        await this._super(...arguments);
        if (params.attributeName === "maxResults" && previewMode === false) {
            return (this.$target.get(0).dataset.maxResults = widgetValue);
        }
        if (["mapType", "mapZoom"].includes(params.attributeName)) {
            console.log("Change in map options not implemented yet");
        }
    },

    cleanForSave() {
        this.mapElement.innerHTML = "";
    },
});

export default {
    OpenLayerStoreLocator: options.registry.OpenLayerStoreLocator,
};
