/** @odoo-module alias=website_geoengine.openlayer_map */

import Search from "./search";
import Popover from "./popover";
import ajax from "web.ajax";

/**
 * The base class that manage all the map
 */
class OpenLayerMap {
    constructor(element, interactive = true) {
        const dataset = element.dataset;

        const storesSource = new ol.source.Vector();
        const stores = new ol.layer.Vector({
            source: storesSource,
        });
        // I set an example of how to use the ajax call with mapType as parameter but of course, this as no sense ;-)
        ajax.jsonRpc('/geodatas/res_partner/stores' , 'call',  {'mapType': dataset.mapType}).then((response) => {     
                storesSource.addFeatures(
                    new ol.format.GeoJSON({
                        dataProjection: "EPSG:4326",
                        featureProjection: "EPSG:3857",
                    }).readFeatures(response)
                );
        });
        console.log("after ajax")

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
