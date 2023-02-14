/** @odoo-module */

import {Component, onWillStart} from "@odoo/owl";
import {loadJS} from "@web/core/assets";
import {BackgroundLayers} from "../../geoengine_common";
import {registry} from "@web/core/registry";

export class FieldGeoEngineEditMap extends Component {
    setup() {
        super.setup();
        this.geoType = null;
        this.map = null;
        this.defaultExtent = null;
        this.format = null;
        this.vectorLayer = null;
        this.rasterLayers = null;
        this.source = null;
        this.features = null;
        this.drawControl = null;
        this.modifyControl = null;
        this.tabListenerInstalled = false;
        this.bgLayers = new BackgroundLayers();

        onWillStart(() => {
            return loadJS(["/base_geoengine/static/lib/ol-7.2.2/ol.js"]);
        });
    }
}

FieldGeoEngineEditMap.template = "FieldGeoEngineEditMap";
registry.category("fields").add("geo_edit_map", FieldGeoEngineEditMap);
