/** @odoo-module **/

/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

import OpenLayerMap from "./map.esm";
import publicWidget from "web.public.widget";

publicWidget.registry.OpenLayerStoreLocator = publicWidget.Widget.extend({
    selector: ".s_openlayer_store_locator",
    cssLibs: [
        "/website_geoengine_store_locator/static/styles.css",
        "/website_geoengine_store_locator/static/lib/node_modules/ol/ol.css",
        "/website_geoengine_store_locator/static/lib/node_modules/jquery-flexdatalist/jquery.flexdatalist.css",
    ],

    /**
     * @override
     */
    start() {
        console.log("start");
        if (!this.el.querySelector(".ol-viewport")) {
            const dataset = this.el.dataset;
            this.element = this.el;
            this.map = new OpenLayerMap(this.element, dataset.mapType);
        }
        return this._super(...arguments);
    },
});

export default publicWidget.registry.OpenLayerStoreLocator;
