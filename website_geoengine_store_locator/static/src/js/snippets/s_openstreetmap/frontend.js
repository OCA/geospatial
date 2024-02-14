/** @odoo-module **/

import publicWidget from "web.public.widget";
import {generateOSMapLink, generateOSMapIframe} from "openstreetmap.utils";

publicWidget.registry.OpenStreetMap = publicWidget.Widget.extend({
    selector: ".s_openstreetmap",
    jsLibs: ["/website_geoengine_store_locator/static/lib/node_modules/ol/dist/ol.js"],
    cssLibs: ["/website_geoengine_store_locator/static/lib/node_modules/ol/ol.css"],

    /**
     * @override
     */
    start() {
        if (!this.el.querySelector(".s_openstreetmap_embedded")) {
            const dataset = this.el.dataset;
            console.log(dataset);

            const map = new ol.Map({
                target: this.el.getElementsByTagName("div")[0],
                layers: [
                    new ol.layer.Tile({
                        source: new ol.source.OSM(),
                    }),
                ],
                view: new ol.View({
                    center: ol.proj.fromLonLat([6, 46]),
                    zoom: 6,
                }),
            });
        }
        return this._super(...arguments);
    },
});

export default publicWidget.registry.OpenStreetMap;
