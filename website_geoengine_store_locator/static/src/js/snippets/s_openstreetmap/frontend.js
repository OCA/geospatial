/** @odoo-module **/

import publicWidget from "web.public.widget";
import {shops} from "./sampleData.js";
import Search from "./search";
import Popover from "./popover";

publicWidget.registry.OpenStreetMap = publicWidget.Widget.extend({
    selector: ".s_openstreetmap",
    jsLibs: ["/website_geoengine_store_locator/static/lib/node_modules/ol/dist/ol.js"],
    cssLibs: [
        "/website_geoengine_store_locator/static/styles.css",
        "/website_geoengine_store_locator/static/lib/node_modules/ol/ol.css",
    ],

    /**
     * @override
     */
    start() {
        if (!this.el.querySelector(".s_openstreetmap_embedded")) {
            const dataset = this.el.dataset;
            console.log(
                "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"
            );
            console.log(dataset);

            const stores = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: new ol.format.GeoJSON({
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857",
                    }).readFeatures(shops),
                }),
            });

            const map = new ol.Map({
                target: document.getElementById("map"),
                layers: [
                    new ol.layer.Tile({
                        // https://www.thunderforest.com/docs/apikeys/
                        source: new ol.source.OSM(),
                    }),
                    stores,
                ],
                view: new ol.View({
                    projection: "EPSG:3857",
                    center: ol.proj.fromLonLat([6, 46]),
                    zoom: 6,
                }),
            });

            const popup = new Popover(document.getElementById("popup"), map);
            const search = new searchFeature(document.getElementById("search"), stores);
        }
        return this._super(...arguments);
    },
});

export default publicWidget.registry.OpenStreetMap;
