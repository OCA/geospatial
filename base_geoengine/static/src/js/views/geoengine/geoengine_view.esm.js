/** @odoo-module */

import {registry} from "@web/core/registry";
import {GeoengineController} from "./geoengine_controller.esm";
import {GeoengineRenderer} from "./geoengine_renderer.esm";
import {_lt} from "@web/core/l10n/translation";
import {GeoengineModel} from "./geoengine_model.esm";
import {GeoengineArchParser} from "./geoengine_arch_parser.esm";

export const geoengineView = {
    type: "geoengine",
    display_name: _lt("Geoengine"),
    icon: "fa fa-map-o",
    multiRecord: true,
    ArchParser: GeoengineArchParser,
    Controller: GeoengineController,
    Renderer: GeoengineRenderer,
    Model: GeoengineModel,

    props: (genericProps, view) => {
        const {ArchParser} = view;
        const {arch} = genericProps;
        const archInfo = new ArchParser().parse(arch);

        return {
            ...genericProps,
            Model: view.Model,
            Renderer: view.Renderer,
            archInfo,
        };
    },
};

registry.category("views").add("geoengine", geoengineView);
