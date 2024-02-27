/** @odoo-module **/

import publicWidget from "web.public.widget";
import OpenLayerMap from "./map";
import rpc from "web.rpc";
import { useService } from '@web/core/utils/hooks';
const { useState } = owl;

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
        const lang = (document.documentElement.getAttribute('lang') || 'en_US').replace('-', '_');


        if (!this.el.querySelector(".ol-viewport")) {
            const dataset = this.el.dataset;
            console.log(dataset);
            this.element = this.el;
            this.map = new OpenLayerMap(this.element, dataset.mapType);
        }
        return this._super(...arguments);
    },
});

export default publicWidget.registry.OpenLayerStoreLocator;
