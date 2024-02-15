/** @odoo-module alias=website_geoengine.openlayer_map */

import {shops} from "./sampleData.js";
import Search from "./search";
import Popover from "./popover";

/**
 * The base class that manage all the map
 */
class OpenLayerMap {
    constructor(element, interactive = true) {
        const dataset = element.dataset;
        console.log(dataset);

        const stores = new ol.layer.Vector();
        fetch("/geodatas/res_partner/stores").then((response) => {
            stores.setSource(
                new ol.source.Vector({
                    features: new ol.format.GeoJSON({
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857",
                    }).readFeatures(response.json()),
                })
            );
        });

        const mapElement = element.querySelector(".map_container");
        const map = new ol.Map({
            target: mapElement,
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
                zoom: 8,
            }),
        });

        if (interactive) {
            const popup = new Popover(mapElement.querySelector("#popup"), map);
            const search = new Search(mapElement.querySelector("#search"), stores);
        }
        return this;
    }
}

export default OpenLayerMap;
