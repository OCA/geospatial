/** @odoo-module alias=website_geoengine.openlayer_map */

import Search from "./search";
import Popover from "./popover";
import ajax from "web.ajax";

/**
 * The base class that manage all the map
 */
class OpenLayerMap {
    constructor(element, mapType = "mapnik", interactive = true) {
        const dataset = element.dataset;

        const storesSource = new ol.source.Vector();
        const stores = new ol.layer.Vector({
            source: storesSource,
        });
        const mapElement = element.querySelector(".map_container");
        const map = new ol.Map({
            target: mapElement,
            layers: [
                new ol.layer.Tile({
                    // https://www.thunderforest.com/docs/apikeys/
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
            }),
        });

        ajax.jsonRpc("/geodatas/res_partner/stores", "call", {
            mapType: dataset.mapType,
        }).then((result) => {
            storesSource.addFeatures(
                new ol.format.GeoJSON({
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                }).readFeatures(result)
            );
            const extent = storesSource.getExtent();
            const addWidth = (extent[2] - extent[0]) / 10;
            const addHeight = (extent[3] - extent[1]) / 10;
            map.getView().fit([
                extent[0] - addWidth,
                extent[1] - addHeight,
                extent[2] + addWidth,
                extent[3] + addHeight,
            ]);
        });

        if (interactive) {
            const popup = new Popover(mapElement.querySelector("#popup"), map);
            const search = new Search(mapElement.querySelector("#search"), stores);
        }
        return this;
    }
}

export default OpenLayerMap;
