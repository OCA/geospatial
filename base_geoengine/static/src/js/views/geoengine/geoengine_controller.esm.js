/** @odoo-module */
import {GeoengineRenderer} from "./geoengine_renderer.esm";
import {Layout} from "@web/search/layout";
import {useModel} from "@web/views/model";
import {useService} from "@web/core/utils/hooks";
import {usePager} from "@web/search/pager_hook";

const {Component, onWillStart} = owl;

export class GeoengineController extends Component {
    setup() {
        super.setup();
        this.orm = useService("orm");
        const {Model, resModel, fields, limit} = this.props;
        this.model = useModel(Model, {
            fields,
            resModel,
            limit,
        });

        usePager(() => {
            const root = this.model.root;
            const {count, limit, offset} = root;
            return {
                offset: offset,
                limit: limit,
                total: count,
                onUpdate: async ({offset, limit}) => {
                    this.model.root.offset = offset;
                    load;
                    this.model.root.limit = limit;
                    await this.model.root.load();
                },
            };
        });

        onWillStart(async () => {
            await this.model.load();
        });
    }
}

GeoengineController.template = "base_geoengine.GeoengineController";
GeoengineController.components = {Layout, GeoengineRenderer};
