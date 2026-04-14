/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

import {BaseOptionComponent} from "@html_builder/core/utils";
import {Plugin} from "@html_editor/plugin";
import {registry} from "@web/core/registry";

export class OpenLayerStoreLocatorOption extends BaseOptionComponent {
    static template = "website_geoengine_store_locator.OpenLayerStoreLocatorOption";
    static selector = ".s_openlayer_store_locator";

    static cleanForSave = (editingEl) => {
        const mapElement = editingEl.querySelector(".map");
        if (mapElement) {
            mapElement.innerHTML = "";
        }

        const popup = editingEl.querySelector("#popup");
        if (!popup && mapElement) {
            const newPopup = document.createElement("div");
            newPopup.id = "popup";
            mapElement.after(newPopup);
        }

        const searchElement = editingEl.querySelector(".search");
        if (searchElement) {
            searchElement.innerHTML = "";
            const input = document.createElement("input");
            input.type = "text";
            input.id = "search";
            input.className = "flexdatalist";
            input.placeholder = "Search store";
            searchElement.appendChild(input);
        }
    };
}

export class OpenLayerStoreLocatorOptionPlugin extends Plugin {
    static id = "openLayerStoreLocatorOption";
    static dependencies = ["edit_interaction"];

    resources = {
        builder_options: [OpenLayerStoreLocatorOption],
        on_snippet_dropped_handlers: ({snippetEl}) => {
            if (snippetEl.matches(".s_openlayer_store_locator")) {
                this.dependencies.edit_interaction.restartInteractions(snippetEl);
            }
        },
    };
}

registry
    .category("website-plugins")
    .add(OpenLayerStoreLocatorOptionPlugin.id, OpenLayerStoreLocatorOptionPlugin);
