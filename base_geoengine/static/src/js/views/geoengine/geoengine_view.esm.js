/** @odoo-module */

/**
 * Copyright 2023 ACSONE SA/NV
 */

import {GeoengineArchParser} from "./geoengine_arch_parser.esm";
import {GeoengineCompiler} from "./geoengine_compiler.esm";
import {GeoengineController} from "./geoengine_controller/geoengine_controller.esm";
import {GeoengineRenderer} from "./geoengine_renderer/geoengine_renderer.esm";
import {RelationalModel} from "@web/model/relational_model/relational_model";
import {_lt} from "@web/core/l10n/translation";
import {registry} from "@web/core/registry";

export const geoengineView = {
    type: "geoengine",
    display_name: _lt("Geoengine"),
    icon: "fa fa-map-o",
    multiRecord: true,
    ArchParser: GeoengineArchParser,
    Controller: GeoengineController,
    Model: RelationalModel,
    Renderer: GeoengineRenderer,
    Compiler: GeoengineCompiler,

    props: (genericProps, view) => {
        const {ArchParser} = view;
        const {arch, relatedModels, resModel} = genericProps;
        const archInfo = new ArchParser().parse(arch, relatedModels, resModel);

        return {
            ...genericProps,
            Model: view.Model,
            Renderer: view.Renderer,
            archInfo,
        };
    },
};

registry.category("views").add("geoengine", geoengineView);
