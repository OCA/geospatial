/** @odoo-module **/

import publicWidget from "web.public.widget";
import OpenLayerMap from "./map";

publicWidget.registry.OpenStreetMap = publicWidget.Widget.extend({
    selector: ".s_openstreetmap",
    cssLibs: [
        "/website_geoengine_store_locator/static/styles.css",
        "/website_geoengine_store_locator/static/lib/node_modules/ol/ol.css",
    ],

    /**
     * @override
     */
    start() {
        if (!this.el.querySelector(".ol-viewport")) {
            const dataset = this.el.dataset;
            console.log(dataset);
            this.element = this.el;
            this.map = new OpenLayerMap(this.element, dataset.mapType);
        }
        return this._super(...arguments);
    },
});

export default publicWidget.registry.OpenStreetMap;
