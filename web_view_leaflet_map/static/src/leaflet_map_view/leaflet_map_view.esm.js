/** @odoo-module **/

import {registry} from "@web/core/registry";

import {LeafletMapArchParser} from "./leaflet_map_arch_parser.esm";
import {LeafletMapController} from "./leaflet_map_controller.esm";
import {LeafletMapModel} from "./leaflet_map_model.esm";
import {LeafletMapRenderer} from "./leaflet_map_renderer.esm";

/**
 * Definition of the leaflet_map view for Odoo.
 * - Separate ArchParser, Model, Controller, Renderer classes
 * - Extensible via spread syntax for custom views
 * - Uses js_class attribute to select custom view implementations
 */
export const leafletMapView = {
    type: "leaflet_map",
    display_name: "Map",
    icon: "fa fa-map-o",
    multiRecord: true,

    // Core components
    Controller: LeafletMapController,
    Renderer: LeafletMapRenderer,
    Model: LeafletMapModel,
    ArchParser: LeafletMapArchParser,

    // Search menu configuration
    searchMenuTypes: ["filter", "favorite"],

    /**
     * Transform generic props into view-specific props.
     *
     * @param {Object} genericProps - Props from the view registry
     * @param {Object} view - The view definition
     * @returns {Object} Transformed props for the controller
     */
    props(genericProps, view) {
        const {arch, fields} = genericProps;

        // Parse the arch using the ArchParser
        const archParser = new (view.ArchParser || LeafletMapArchParser)();
        const archInfo = archParser.parse(arch);

        // Check if a custom js_class is specified
        let viewDefinition = view;
        if (archInfo.jsClass) {
            const customView = registry.category("views").get(archInfo.jsClass, null);
            if (customView) {
                viewDefinition = customView;
            }
        }

        return {
            ...genericProps,
            archInfo,
            fields,
            // Allow overriding Model and Renderer via js_class
            Model: viewDefinition.Model || LeafletMapModel,
            Renderer: viewDefinition.Renderer || LeafletMapRenderer,
        };
    },
};

// Register the view without force:true
registry.category("views").add("leaflet_map", leafletMapView);

// Export components for extension
export {
    LeafletMapArchParser,
    LeafletMapController,
    LeafletMapModel,
    LeafletMapRenderer,
};
