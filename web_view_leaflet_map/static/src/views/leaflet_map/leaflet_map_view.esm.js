import {MapController} from "./leaflet_map_controller.esm";
import {MapRenderer} from "./leaflet_map_renderer.esm";
import {registry} from "@web/core/registry";

/* global DOMParser */

/**
 * Helper function that normalize the architecture input to ensure it is an HTMLElement.
 * @param arch
 * @returns {HTMLElement|*}
 */
function normalizeArch(arch) {
    if (arch && typeof arch !== "string") return arch;
    const xml = String(arch || "");
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    return doc.documentElement;
}

/**
 * Definition of the map view for Odoo, including its properties and components.
 * @type {{
 *      type: string,
 *      display_name: string,
 *      icon: string,
 *      multiRecord: boolean,
 *      Controller: MapController,
 *      Renderer: MapRenderer,
 *      searchMenuTypes: string[],
 *      props: (function(*, *): *&{archInfo: {arch: *}, Renderer: MapRenderer})
 * }}
 */
export const leafletMapView = {
    type: "leaflet_map",
    display_name: "Map",
    icon: "fa fa-map-o",
    multiRecord: true,
    Controller: MapController,
    Renderer: MapRenderer,
    searchMenuTypes: ["filter", "favorite"],

    props: (genericProps) => {
        const archEl = normalizeArch(genericProps.arch);
        return {
            ...genericProps,
            Renderer: MapRenderer,
            archInfo: {
                arch: archEl,
            },
        };
    },
};

registry.category("views").add("leaflet_map", leafletMapView);
