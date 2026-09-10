/** @odoo-module **/

/* global console */
import options from "@web_editor/js/editor/snippets.options";
import {createOlMap} from "./map_utils.esm";

/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

options.registry.OpenLayerStoreLocator = options.Class.extend({
    jsLibs: [
        "/website_geoengine_store_locator/static/lib/node_modules/ol/dist/ol.js",
        "/website_geoengine_store_locator/static/lib/node_modules/jquery-flexdatalist/jquery.flexdatalist.js",
    ],

    cssLibs: [
        "/website_geoengine_store_locator/static/lib/node_modules/ol/ol.css",
        "/website_geoengine_store_locator/static/lib/node_modules/jquery-flexdatalist/jquery.flexdatalist.css",
    ],

    async onBuilt() {
        this._super.apply(this, arguments);
        this.element = this.$target[0];
        this.mapType = this.element.dataset.mapType;
        this.mapElement = this.element.querySelector(".map");
        createOlMap(this.mapElement, this.mapType);
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
        // The editor can clean an option after its target has been rebuilt
        // (for example, when a snippet is dragged and dropped). In that case
        // `onBuilt` may not have initialized `mapElement` yet.
        if (this.mapElement) {
            this.mapElement.innerHTML = "";
        }
    },
});

export default {
    OpenLayerStoreLocator: options.registry.OpenLayerStoreLocator,
};
