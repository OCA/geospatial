/**
 * Copyright 2011-2024 Camptocamp SA
 * License AGPL-3.0 or later (http://www.gnu.org/licenses/agpl)
 */

import {rpc} from "@web/core/network/rpc";
import {registry} from "@web/core/registry";
import {Interaction} from "@web/public/interaction";
import OpenLayerMap from "./map.esm";

export class OpenLayerStoreLocator extends Interaction {
    static selector = ".s_openlayer_store_locator";

    /**
     * @override
     */
    start() {
        if (!this.el.querySelector(".ol-viewport")) {
            const dataset = this.el.dataset;
            this.map = new OpenLayerMap(this.el, dataset.mapType, rpc);
        }
        return super.start(...arguments);
    }
}

registry
    .category("public.interactions")
    .add(
        "website_geoengine_store_locator.open_layer_store_locator",
        OpenLayerStoreLocator
    );
