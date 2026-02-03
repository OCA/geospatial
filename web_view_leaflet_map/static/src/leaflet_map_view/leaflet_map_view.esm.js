/** @odoo-module **/
/*
 * Copyright (C) 2025 KMEE (https://kmee.com.br)
 * @author Luis Felipe Mileo <mileo@kmee.com.br>
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl.html).
 */

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
 * - Integrates with Odoo's search infrastructure (SearchBar, filters, groupBy, favorites)
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

    // Search menu configuration - enables filter, groupBy, and favorites
    searchMenuTypes: ["filter", "groupBy", "favorite"],

    // Button template for control panel (empty by default)
    buttonTemplate: "web_view_leaflet_map.LeafletMapView.Buttons",

    /**
     * Transform generic props into view-specific props.
     * Follows the pattern from graphView in Odoo core.
     *
     * @param {Object} genericProps - Props from the view registry
     * @param {Object} view - The view definition
     * @returns {Object} Transformed props for the controller
     */
    props(genericProps, view) {
        let modelParams = null;

        // Check if we have state from a previous session (for state restoration)
        if (genericProps.state?.metaData) {
            modelParams = genericProps.state.metaData;
        } else {
            const {arch, resModel, fields} = genericProps;

            // Parse the arch using the ArchParser
            const parser = new (view.ArchParser || LeafletMapArchParser)();
            const archInfo = parser.parse(arch, fields);

            // Check if a custom js_class is specified
            if (archInfo.jsClass) {
                const customView = registry
                    .category("views")
                    .get(archInfo.jsClass, null);
                if (customView) {
                    // Re-parse with custom parser if available
                    const customParser = new (customView.ArchParser ||
                        LeafletMapArchParser)();
                    const customArchInfo = customParser.parse(arch, fields);
                    Object.assign(archInfo, customArchInfo);
                }
            }

            modelParams = {
                archInfo,
                fields,
                fieldNames: archInfo.fieldNames || [],
                limit: archInfo.limit || 500,
                offset: 0,
                resModel,
                context: genericProps.context || {},
            };
        }

        // Get the view definition (may be overridden by js_class)
        let viewDefinition = view;
        if (modelParams.archInfo?.jsClass) {
            const customView = registry
                .category("views")
                .get(modelParams.archInfo.jsClass, null);
            if (customView) {
                viewDefinition = customView;
            }
        }

        return {
            ...genericProps,
            modelParams,
            Model: viewDefinition.Model || LeafletMapModel,
            Renderer: viewDefinition.Renderer || LeafletMapRenderer,
            buttonTemplate:
                viewDefinition.buttonTemplate ||
                "web_view_leaflet_map.LeafletMapView.Buttons",
        };
    },
};

// Register the view
registry.category("views").add("leaflet_map", leafletMapView);

// Export components for extension
export {
    LeafletMapArchParser,
    LeafletMapController,
    LeafletMapModel,
    LeafletMapRenderer,
};
