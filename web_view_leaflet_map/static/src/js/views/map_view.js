/** @odoo-module **/

import {MapRenderer} from "./map_renderer/map_renderer";
import {MapController} from "./map_controller/map_controller";
import {MapArchParser} from "./map_arch_parser";
import {_lt} from "@web/core/l10n/translation";
import {registry} from "@web/core/registry";
import {RelationalModel} from "@web/model/relational_model/relational_model";
import {MapCompiler} from "./map_compiler";

export const mapView = {
    type: "leaflet_map",
    display_name: _lt("Map"),
    icon: "fa fa-map-o",
    multiRecord: true,
    Controller: MapController,
    Renderer: MapRenderer,
    Compiler: MapCompiler,
    ArchParser: MapArchParser,
    Model: RelationalModel,

    props: (genericProps, view) => {
        const {ArchParser} = view;
        const {arch, relatedModels, resModel} = genericProps;
        const archInfo = new ArchParser().parse(arch, relatedModels, resModel);

        return {
            ...genericProps,
            Model: view.Model,
            Renderer: view.Renderer,
            archInfo,
            Compiler: view.Compiler,
        };
    },
};

registry.category("views").add("leaflet_map", mapView);
