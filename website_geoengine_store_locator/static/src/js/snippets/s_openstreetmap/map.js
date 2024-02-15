/** @odoo-module alias=website_geoengine.openlayer_map */

import {shops} from "./sampleData.js";
import Search from "./search";
import Popover from "./popover";

class OpenLayerMap {

    stores = undefined
    map = undefined
    popup = undefined
    search = undefined
    dataset = undefined


    constructor(element, interactive = true) {

        this.dataset = element.dataset;
        this.stores = new ol.layer.Vector({
            source: new ol.source.Vector({
                features: new ol.format.GeoJSON({
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                }).readFeatures(shops),
            }),
        });

        this.map = new ol.Map({
            target: element.querySelector(".map_container"),
            layers: [
                new ol.layer.Tile({
                    // https://www.thunderforest.com/docs/apikeys/
                    source: new ol.source.OSM(),
                }),
                this.stores,
            ],
            view: new ol.View({
                projection: "EPSG:3857",
                center: ol.proj.fromLonLat([6, 46]),
                zoom: 8,
            }),
        });
    
        if (interactive) 
        {
            console.log(element.querySelector(".map_container"))
            console.log(element.querySelector(".map_container").querySelector("div"))

            this.popup = new Popover(element.querySelector(".map_container").querySelector("div"), this.map);
            this.search = new Search(element.querySelector(".map_container").querySelector(".search"), this.stores);
        } 
        return this;
  
    }
    
  

}

export default OpenLayerMap;
