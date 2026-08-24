/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

/* global ol */

import {OpenLayerStoreLocator} from "./frontend.esm";
import {registry} from "@web/core/registry";

const OpenLayerStoreLocatorEdit = (I) =>
    class extends I {
        setup() {
            super.setup();
            this.websiteEditService = this.services.website_edit;
        }

        async willStart() {
            // Check if OpenLayers is already loaded in the editor
            if (typeof ol !== "object") {
                console.warn("OpenLayers not loaded in editor context");
            }
            return super.willStart();
        }
    };

registry
    .category("public.interactions.edit")
    .add("website_geoengine_store_locator.open_layer_store_locator", {
        Interaction: OpenLayerStoreLocator,
        mixin: OpenLayerStoreLocatorEdit,
    });
