/** @odoo-module alias=website_geoengine_store_locator.openlayer_map */

/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

import Popover from "./popover.esm";
import Search from "./search.esm";

/**
 * The base class that manage all the map
 */
class OpenLayerMap {
    constructor(element, mapType = "mapnik") {
        const dataset = element.dataset;
        const storesSource = new ol.source.Vector();
        const stores = new ol.layer.Vector({
            source: storesSource,
        });
        const mapElement = element.querySelector(".map");
        const map = new ol.Map({
            target: mapElement,
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
                        }[mapType],
                    }),
                }),
                stores,
            ],
            view: new ol.View({
                projection: "EPSG:3857",
                center: ol.proj.fromLonLat([6, 46]),
                zoom: 8,
                minResolution: 0.299,
            }),
        });

        if (mapElement) {
            new Popover(element.querySelector("#popup"), map);
            new Search(
                element.querySelector("#search"),
                map,
                mapElement,
                stores,
                dataset.maxResults,
                dataset.mapZoom
            );
        }
        return this;
    }
}

export default OpenLayerMap;
